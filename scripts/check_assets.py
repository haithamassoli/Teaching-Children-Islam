"""One runnable integrity check for the delivered asset pack."""
from pathlib import Path
from collections import Counter
import hashlib
import json
import subprocess
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parents[1] / "assets"
manifest = json.loads((root / "manifest.json").read_text())
items = manifest["assets"]
assert len({item["id"] for item in items}) == len(items), "Duplicate IDs"
counts = Counter(item["category"] for item in items)
assert counts == {"characters": 5, "worlds": 7, "badges": 14, "rewards": 8, "icons": 30, "audio/guide": 41, "audio/effects": 5, "fantasy/characters": 4, "fantasy/worlds": 7, "fantasy/badges": 14, "fantasy/rewards": 8, "fantasy/activities": 4, "fantasy/objects": 4}, counts
for item in items:
    path = (root / item["path"]).resolve()
    assert path.is_relative_to(root) and path.is_file(), path
    assert path.stat().st_size == item["bytes"] > 0, path
    assert hashlib.sha256(path.read_bytes()).hexdigest() == item["sha256"], path
    assert item["reviewStatus"] in {"pending", "approved"}
    if item["reviewStatus"] == "approved":
        assert item["publishable"] is True
        assert item.get("approvedBy") and item.get("approvedAt")
        assert item.get("rightsStatus") == "documented"
        assert item.get("rightsEvidence")
    else:
        assert item["publishable"] is False
    if path.suffix == ".svg":
        svg = ET.parse(path).getroot()
        assert svg.find("{http://www.w3.org/2000/svg}title") is not None, path
        if item["category"].startswith("fantasy/"):
            ids = {element.get("id") for element in svg.iter() if element.get("id")}
            for element in svg.iter():
                assert element.tag.split("}")[-1] not in {"script", "foreignObject"}, path
                for attribute, value in element.attrib.items():
                    assert not attribute.startswith("on"), path
                    if attribute == "href":
                        assert value.startswith("#") and value[1:] in ids, (path, value)
    elif item["category"].startswith("audio/"):
        subprocess.run(["ffmpeg", "-v", "error", "-xerror", "-i", str(path), "-f", "null", "-"], check=True, capture_output=True)
for world in manifest["worlds"]:
    assert (root / world["icon"]).is_file()
    assert (root / world["badge"]).is_file()
    assert (root / "worlds" / f'{world["id"]}.webp').is_file()
for group in ("characters", "worlds", "activities", "objects"):
    for item in manifest["fantasy"][group]:
        assert any(asset["path"] == item["path"] for asset in items), item
        if group == "worlds":
            assert (root / item["badge"]).is_file()
            assert (root / "fantasy" / "badges" / f'{item["id"]}-locked.svg').is_file()
scripts = json.loads((root / "audio" / "guide-scripts.json").read_text())
assert len({s["id"] for s in scripts}) == 41
for script in scripts:
    assert (root / "audio" / script["recording"]).is_file(), script["id"]
print(f"PASS: {len(items)} assets, unique IDs, hashes, SVG titles and 46 decoded audio files")
