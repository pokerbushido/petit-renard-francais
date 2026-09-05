# /// script
# requires-python = ">=3.11"
# dependencies = ["mlx-audio>=0.5.1", "numpy"]
# ///
"""TTS worker: Qwen3-TTS on MLX, voices cloned from tools/voices/{fr,it}.wav.

Spawned by tools/tts.mjs, which owns phrase collection, file naming and the
index. Protocol, one JSON object per line:

    stdin  -> {"text": "...", "lang": "fr", "out": "/abs/path.mp3", "short": true}
    stdout <- {"out": "/abs/path.mp3", "ok": true, "seconds": 1.2}
              {"out": "/abs/path.mp3", "ok": false, "error": "..."}

    uv run tools/tts_local.py --check    # generate one clip, verify the mp3

Runs on the Mac, fully offline after the first model download (~2.9 GB in
~/.cache/huggingface). Replaces ElevenLabs: same voices, no subscription.
"""

import json
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import numpy as np

MODEL_ID = "mlx-community/Qwen3-TTS-12Hz-1.7B-Base-8bit"
VOICES_DIR = Path(__file__).resolve().parent / "voices"
LANG_CODE = {"fr": "French", "it": "Italian"}
MP3_BITRATE = "64k"
MP3_RATE = "44100"
# A short clip is a word the child imitates: cooler sampling, no drift.
TEMPERATURE = {"short": 0.55, "long": 0.75}
# Guard against the "eeeeh... le champignon" 9-second improvisation:
# a clip longer than this budget is regenerated (bounded retries).
SECONDS_PER_CHAR = 0.12
SECONDS_SLACK = 1.2
MAX_TRIES = 3


def log(msg: str) -> None:
    print(msg, file=sys.stderr, flush=True)


def load_voice(lang: str) -> tuple[str, str]:
    wav = VOICES_DIR / f"{lang}.wav"
    txt = VOICES_DIR / f"{lang}.txt"
    if not wav.exists() or not txt.exists():
        raise FileNotFoundError(f"reference voice missing for '{lang}': {wav}, {txt}")
    return str(wav), txt.read_text(encoding="utf-8").strip()


def load_model():
    from mlx_audio.tts.utils import load_model

    log(f"loading {MODEL_ID} ...")
    return load_model(MODEL_ID)


def synth(model, text: str, lang: str, short: bool) -> tuple[np.ndarray, int]:
    ref_audio, ref_text = load_voice(lang)
    budget = SECONDS_SLACK + SECONDS_PER_CHAR * len(text)
    best = None
    for attempt in range(1, MAX_TRIES + 1):
        result = next(iter(model.generate(
            text=text,
            ref_audio=ref_audio,
            ref_text=ref_text,
            lang_code=LANG_CODE.get(lang, "auto"),
            temperature=TEMPERATURE["short" if short else "long"],
        )))
        audio = np.asarray(result.audio, dtype=np.float32).reshape(-1)
        seconds = audio.size / result.sample_rate
        if best is None or seconds < best[0]:
            best = (seconds, audio, result.sample_rate)
        if seconds <= budget:
            return audio, result.sample_rate
        log(f"  retry {attempt}: {seconds:.1f}s > budget {budget:.1f}s for {text!r}")
    return best[1], best[2]


def write_mp3(audio: np.ndarray, sample_rate: int, out: Path) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    pcm = (np.clip(audio, -1.0, 1.0) * 32767).astype("<i2")
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=True) as tmp:
        with wave.open(tmp.name, "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(sample_rate)
            w.writeframes(pcm.tobytes())
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", tmp.name,
             "-ar", MP3_RATE, "-ac", "1", "-b:a", MP3_BITRATE, str(out)],
            check=True,
        )


def serve() -> None:
    # Only protocol replies may reach the real stdout: mlx-audio and
    # transformers print progress lines there, which would break the
    # line-per-JSON contract with tts.mjs. Everything else goes to stderr.
    proto, sys.stdout = sys.stdout, sys.stderr
    model = load_model()
    log("ready")
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        job = json.loads(line)
        out = Path(job["out"])
        try:
            audio, rate = synth(model, job["text"], job["lang"], bool(job.get("short")))
            write_mp3(audio, rate, out)
            reply = {"out": str(out), "ok": True, "seconds": round(audio.size / rate, 2)}
        except Exception as exc:  # noqa: BLE001 — the caller decides, never crash the worker
            reply = {"out": str(out), "ok": False, "error": str(exc)}
        print(json.dumps(reply, ensure_ascii=False), file=proto, flush=True)


def check() -> None:
    """Generate one FR and one IT clip into a temp dir and verify the mp3s."""
    model = load_model()
    with tempfile.TemporaryDirectory() as d:
        for text, lang, short in (("le champignon", "fr", True), ("Bravo, hai trovato il gatto!", "it", False)):
            out = Path(d) / f"{lang}.mp3"
            audio, rate = synth(model, text, lang, short)
            write_mp3(audio, rate, out)
            seconds = audio.size / rate
            assert out.stat().st_size > 1000, out
            assert seconds <= SECONDS_SLACK + SECONDS_PER_CHAR * len(text), f"{text!r}: {seconds:.1f}s too long"
            probe = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_name,sample_rate",
                                    "-of", "csv=p=0", str(out)], capture_output=True, text=True, check=True).stdout
            assert "mp3" in probe and MP3_RATE in probe, probe
            log(f"  ok {lang}: {seconds:.2f}s -> {out.stat().st_size} bytes")
    log("self-check ok")


if __name__ == "__main__":
    check() if "--check" in sys.argv[1:] else serve()
