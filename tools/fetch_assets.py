#!/usr/bin/env python3
"""Scarica gli emoji Noto (animati dove esistono, PNG statici altrimenti)
per tutti gli emoji usati in data.js/app.js e genera assets-map.js.

Uso: python3 tools/fetch_assets.py   (dalla root del progetto)
"""
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
ANIM_URL = "https://fonts.gstatic.com/s/e/notoemoji/latest/{cp}/512.webp"
PNG_URL = "https://raw.githubusercontent.com/googlefonts/noto-emoji/main/png/128/emoji_u{cp}.png"

EMOJI_RE = re.compile(
    "[\U0001F000-\U0001FAFF☀-➿⬀-⯿←-⇿"
    "️‍\U0001F1E6-\U0001F1FF]+"
)


def extract_emojis(text):
    found = []
    for match in EMOJI_RE.finditer(text):
        cluster = match.group()
        if cluster not in found:
            found.append(cluster)
    return found


def codepoints(cluster, keep_fe0f):
    cps = [f"{ord(c):x}" for c in cluster if keep_fe0f or ord(c) != 0xFE0F]
    return "_".join(cps)


def fetch(url):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "curl/8"})
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.read() if r.status == 200 else None
    except Exception:
        return None


def main():
    sources = ""
    for name in ("data.js", "app.js"):
        path = ROOT / name
        if path.exists():
            sources += path.read_text(encoding="utf-8")
    emojis = extract_emojis(sources)
    if not emojis:
        sys.exit("Nessun emoji trovato nei sorgenti")

    ASSETS.mkdir(exist_ok=True)
    mapping = {}
    animated = static = missing = 0

    for cluster in emojis:
        cp_plain = codepoints(cluster, keep_fe0f=False)
        cp_full = codepoints(cluster, keep_fe0f=True)
        if not cp_plain:
            continue
        # 1) webp animato (prova con e senza fe0f)
        done = False
        for cp in dict.fromkeys([cp_full, cp_plain]):
            dest = ASSETS / f"{cp_plain}.webp"
            if dest.exists():
                mapping[cluster] = dest.name
                animated += 1
                done = True
                break
            data = fetch(ANIM_URL.format(cp=cp))
            if data:
                dest.write_bytes(data)
                mapping[cluster] = dest.name
                animated += 1
                done = True
                break
        if done:
            continue
        # 2) png statico
        dest = ASSETS / f"{cp_plain}.png"
        if dest.exists():
            mapping[cluster] = dest.name
            static += 1
            continue
        data = fetch(PNG_URL.format(cp=cp_plain))
        if data:
            dest.write_bytes(data)
            mapping[cluster] = dest.name
            static += 1
        else:
            missing += 1
            print(f"  MANCANTE: {cluster} ({cp_plain}) -> fallback testo")

    out = ["// Generato da tools/fetch_assets.py — non editare a mano",
           "const EMOJI_ASSET = {"]
    for cluster, fname in sorted(mapping.items(), key=lambda kv: kv[1]):
        out.append(f'  "{cluster}": "assets/{fname}",')
    out.append("};\n")
    (ROOT / "assets-map.js").write_text("\n".join(out), encoding="utf-8")

    total_kb = sum(f.stat().st_size for f in ASSETS.iterdir()) // 1024
    print(f"OK: {animated} animati, {static} statici, {missing} mancanti, "
          f"{len(mapping)} mappati, assets/ = {total_kb} KB")


if __name__ == "__main__":
    main()
