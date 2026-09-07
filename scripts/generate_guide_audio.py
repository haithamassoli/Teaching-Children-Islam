"""Generate REVIEW-ONLY speech, never Quran recitations.

uv run --python 3.12 --with piper-tts==1.8.0 python scripts/generate_guide_audio.py MODEL.onnx
Requires ffmpeg. Model rights still need clearance; see assets/README.md.
"""
from pathlib import Path
import json
import subprocess
import sys
import tempfile
import wave
from piper import PiperVoice

root = Path(__file__).resolve().parents[1] / "assets" / "audio"
voice = PiperVoice.load(sys.argv[1])
scripts = json.loads((root / "guide-scripts.json").read_text())
with tempfile.TemporaryDirectory(prefix="tci-guide-") as temporary:
    for item in scripts:
        destination = root / item["recording"]
        if destination.exists():
            continue
        wav = Path(temporary) / "speech.wav"
        with wave.open(str(wav), "wb") as output:
            voice.synthesize_wav(item["text"], output)
        destination.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(wav), "-af", "loudnorm=I=-20:TP=-2:LRA=7", "-ar", "22050", "-ac", "1", "-b:a", "64k", str(destination)], check=True)
        print(item["id"], flush=True)
