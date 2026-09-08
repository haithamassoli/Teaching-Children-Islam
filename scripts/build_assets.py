"""Build original SVG assets, non-musical effects and the local asset catalogue.

Run: python3 scripts/build_assets.py
Raster illustrations are generated separately; this script never overwrites them.
"""
from pathlib import Path
import array
import hashlib
import html
import json
import math
import random
import sys
import wave
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1] / "assets"
WORLDS = [
    ("faith", "الإيمان", "#387d79", "sun"),
    ("manners", "الآداب", "#b66349", "door"),
    ("ethics", "الأخلاق والسلوك", "#63854c", "heart"),
    ("worship", "العبادات", "#327c95", "mosque"),
    ("quran", "القرآن ومعانيه", "#78619b", "book"),
    ("stories", "القصص", "#b07932", "palm"),
    ("memorization", "الحفظ", "#9e6483", "repeat"),
]
CHARACTERS = [("sami", "سامي"), ("omar", "عمر"), ("maryam", "مريم"), ("nour", "نور"), ("guide", "المرشد رفيق")]
ICONS = {
    "sun": ("حديقة الإيمان", '<circle cx="32" cy="32" r="12"/><path d="M32 7v6m0 38v6M7 32h6m38 0h6M14 14l5 5m26 26 5 5M14 50l5-5m26-26 5-5"/>'),
    "door": ("باب الآداب", '<path d="M14 56V12h36v44M21 56V18l22-6v44Z"/><circle cx="36" cy="35" r="1"/>'),
    "heart": ("التعاون والعناية", '<path d="M32 53 11 33C-2 17 20 5 32 20 44 5 66 17 53 33Z"/>'),
    "mosque": ("المسجد", '<path d="M16 55V31h37v24ZM22 31c0-9 12-11 12-19 0 8 13 10 13 19M6 55V18h7v37M6 18l3.5-9 3.5 9M29 55V43a6 6 0 0 1 12 0v12"/>'),
    "book": ("كتاب", '<path d="M32 17Q19 8 7 14v37q12-6 25 2 13-8 25-2V14q-12-6-25 3v36M14 23l10 1m-10 9 10 1m16-10 10-1m-10 11 10-1"/>'),
    "palm": ("واحة القصص", '<path d="M29 56 33 23M33 23Q15 5 7 25q14-7 26-2ZM33 23Q45 4 58 22q-13-4-25 1ZM33 23Q25 6 36 5q11 7-3 18M17 57h30"/>'),
    "repeat": ("إعادة وتكرار", '<path d="M13 24a21 21 0 0 1 37-6l5 7M55 12v13H42M51 40a21 21 0 0 1-37 6l-5-7M9 52V39h13"/>'),
    "play": ("تشغيل", '<path d="m24 13 27 19-27 19Z"/>'),
    "pause": ("إيقاف مؤقت", '<path d="M23 14v36m18-36v36"/>'),
    "stop": ("إيقاف", '<rect x="17" y="17" width="30" height="30" rx="4"/>'),
    "sound": ("الصوت", '<path d="M8 25h12l14-12v38L20 39H8ZM43 23q9 9 0 18m6-25q17 16 0 32"/>'),
    "mute": ("كتم الصوت", '<path d="M8 25h12l14-12v38L20 39H8ZM44 25l13 14m0-14L44 39"/>'),
    "microphone": ("تسجيل الصوت", '<rect x="24" y="7" width="16" height="32" rx="8"/><path d="M16 30v3a16 16 0 0 0 32 0v-3M32 49v9M23 58h18"/>'),
    "check": ("مكتمل", '<circle cx="32" cy="32" r="24"/><path d="m18 32 10 10 19-21"/>'),
    "retry": ("حاول مرة أخرى", '<path d="M12 25a22 22 0 1 1-1 18M12 10v15h15"/>'),
    "lock": ("مرحلة مقفلة", '<rect x="14" y="28" width="36" height="29" rx="7"/><path d="M22 28V18a10 10 0 0 1 20 0v10M32 40v7"/>'),
    "unlock": ("مرحلة متاحة", '<rect x="14" y="28" width="36" height="29" rx="7"/><path d="M22 28V18a10 10 0 0 1 19-4M32 40v7"/>'),
    "map": ("خريطة العوالم", '<path d="m7 15 17-7 16 7 17-7v41l-17 7-16-7-17 7ZM24 8v41m16-34v41"/>'),
    "home": ("الرئيسية", '<path d="m7 29 25-21 25 21M14 24v32h36V24M26 56V38h12v18"/>'),
    "next-rtl": ("التالي", '<path d="m39 12-20 20 20 20M20 32h35"/>'),
    "back-rtl": ("السابق", '<path d="m25 12 20 20-20 20M9 32h35"/>'),
    "choice": ("اختر الإجابة", '<rect x="9" y="9" width="46" height="46" rx="10"/><path d="m19 32 9 9 18-19"/>'),
    "order": ("رتب الخطوات", '<path d="M25 15h30M25 32h30M25 49h30M9 13l3-3v12M8 31q8-8 8 0l-8 7h8M8 45h8l-5 5q9 0 4 6H8"/>'),
    "match": ("صل المتشابه", '<circle cx="13" cy="15" r="6"/><circle cx="51" cy="15" r="6"/><circle cx="13" cy="49" r="6"/><circle cx="51" cy="49" r="6"/><path d="m19 18 26 27m-26 0 26-27"/>'),
    "parent": ("منطقة الوالد", '<circle cx="26" cy="17" r="9"/><circle cx="47" cy="31" r="7"/><path d="M8 54v-9a18 18 0 0 1 31-12M35 55V46a12 12 0 0 1 24 0v9"/>'),
    "offline": ("انقطع الاتصال", '<path d="M8 19q24-19 48 0M17 29q15-13 30 0M25 40q7-7 14 0M9 7l46 50"/><circle cx="32" cy="51" r="2"/>'),
    "upload": ("إرسال التسجيل", '<path d="M32 43V9m-13 13L32 9l13 13M9 41v13h46V41"/>'),
    "water": ("الماء", '<path d="M32 7C27 20 12 30 12 40a20 20 0 0 0 40 0C52 30 37 20 32 7ZM21 41q0 10 10 10"/>'),
    "help": ("مساعدة", '<circle cx="32" cy="32" r="25"/><path d="M23 23a9 9 0 1 1 13 8q-4 2-4 8"/><circle cx="32" cy="47" r="1"/>'),
    "settings": ("الإعدادات", '<path d="M9 17h46M9 32h46M9 47h46"/><circle cx="23" cy="17" r="5" fill="#fff7e9"/><circle cx="42" cy="32" r="5" fill="#fff7e9"/><circle cx="26" cy="47" r="5" fill="#fff7e9"/>'),
}
STAR = '<path d="m32 6 8 17 19 3-14 14 3 19-16-9-17 9 4-19L5 26l19-3Z"/>'


def write_svg(path, label, body, color="#286d6c", viewbox="0 0 64 64"):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}" role="img" aria-labelledby="title"><title id="title">{html.escape(label)}</title><g fill="none" stroke="{color}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">{body}</g></svg>\n')


def build_vectors():
    for key, (label, body) in ICONS.items():
        write_svg(ROOT / "icons" / f"{key}.svg", label, body)
    for key, label, color, icon in WORLDS:
        for state in ("earned", "locked"):
            ink = color if state == "earned" else "#767c80"
            body = f'<path d="m24 71-5 24 13-5 10 7 8-23m0 0 8 23 10-7 13 5-5-24" fill="{ink}" stroke="{ink}"/><circle cx="50" cy="43" r="35" fill="#fff7e9" stroke="{ink}" stroke-width="5"/><circle cx="50" cy="43" r="28" stroke="#d7b875" stroke-width="2"/><g transform="translate(26 19) scale(.75)">{ICONS[icon if state == "earned" else "lock"][1]}</g>'
            write_svg(ROOT / "badges" / f"{key}-{state}.svg", f"شارة {label} — {'مكتسبة' if state == 'earned' else 'لم تكتسب بعد'}", body, ink, "0 0 100 100")
    for state, fill in [("earned", "#efba4c"), ("empty", "#eee7d9")]:
        write_svg(ROOT / "rewards" / f"star-{state}.svg", "نجمة مكتسبة" if state == "earned" else "نجمة لم تكتسب بعد", f'<g fill="{fill}">{STAR}</g>', "#9a722f")
    for count in range(4):
        body = ''.join(f'<g transform="translate({i*68} 0)" fill="{"#efba4c" if i < count else "#eee7d9"}">{STAR}</g>' for i in range(3))
        write_svg(ROOT / "rewards" / f"stars-{count}.svg", f"{count} من ثلاث نجوم", body, "#9a722f", "0 0 200 64")
    write_svg(ROOT / "rewards" / "world-complete.svg", "إكمال عالم", '<path d="M22 10h20v20a10 10 0 0 1-20 0ZM22 15H9v9q0 13 15 13M42 15h13v9q0 13-15 13M32 40v13M20 56h24"/>', "#a7792e")
    write_svg(ROOT / "rewards" / "celebration.svg", "زينة الاحتفال بالإكمال", '<path d="m7 15 4 7m40-12-3 7M9 49l7-3m35 2 5 4M29 7l4 3m-3 45 3-4" stroke="#ba745b"/><g transform="translate(15 14) scale(.55)" fill="#efba4c">'+STAR+'</g>', "#a7792e")


def build_effects():
    # Noise transients only: no pitched oscillator, melody or musical rhythm.
    for index, (name, duration, decay) in enumerate([("tap", .09, 65), ("page-turn", .48, 7), ("soft-pop", .16, 32), ("soft-swish", .36, 9), ("book-close", .22, 24)]):
        rng = random.Random(index)
        samples = array.array("h")
        previous = 0
        for i in range(int(22050 * duration)):
            t = i / 22050
            previous = previous * .65 + rng.uniform(-1, 1) * .35
            envelope = min(1, t / .008) * math.exp(-decay * t) * min(1, (duration-t)/.025)
            samples.append(round(previous * envelope * 17000))
        if sys.byteorder != "little":
            samples.byteswap()
        target = ROOT / "audio" / "effects" / f"{name}.wav"
        target.parent.mkdir(parents=True, exist_ok=True)
        with wave.open(str(target), "wb") as output:
            output.setparams((1, 2, 22050, 0, "NONE", "not compressed"))
            output.writeframes(samples.tobytes())


def build_catalogue():
    items = []
    previous = {}
    manifest_file = ROOT / "manifest.json"
    if manifest_file.is_file():
        previous = {item["path"]: item for item in json.loads(manifest_file.read_text()).get("assets", [])}
    labels = dict(CHARACTERS) | {w[0]: w[1] for w in WORLDS} | {k:v[0] for k,v in ICONS.items()}
    for path in sorted(ROOT.rglob("*")):
        if path.suffix not in {".png", ".webp", ".svg", ".wav", ".mp3", ".m4a"}:
            continue
        rel = path.relative_to(ROOT).as_posix()
        # WebP is the display variant; preserve PNG as the original, not a second asset.
        if path.suffix == ".png" and path.with_suffix(".webp").exists():
            continue
        source = "imagegen" if path.suffix in {".png", ".webp"} else "original-project"
        if rel.startswith("audio/guide/"):
            source = "piper-kareem"
        label = labels.get(path.stem, path.stem)
        if path.suffix == ".svg":
            label = ET.parse(path).getroot().find("{http://www.w3.org/2000/svg}title").text
        sha256 = hashlib.sha256(path.read_bytes()).hexdigest()
        item = {"id": rel.rsplit(".", 1)[0].replace("/", "."), "path": rel, "label": label, "category": str(path.relative_to(ROOT).parent), "source": source, "reviewStatus": "pending", "publishable": False, "bytes": path.stat().st_size, "sha256": sha256}
        old = previous.get(rel)
        if old and old.get("sha256") == sha256:
            for key in ("reviewStatus", "publishable", "rightsStatus", "rightsEvidence", "approvedBy", "approvedAt"):
                if key in old:
                    item[key] = old[key]
        elif old and old.get("reviewStatus") == "approved":
            item["reviewResetReason"] = "file hash changed; review required again"
        items.append(item)
    manifest = {"version": 1, "basePath": "assets/", "reviewNote": "كل الأصول تنتظر المراجعة؛ أصوات المرشد التجريبية تنتظر توثيق الحقوق أيضًا.", "worlds": [{"id": key, "name": name, "color": color, "icon": f"icons/{icon}.svg", "badge": f"badges/{key}-earned.svg", "unlockRule": "complete_all_published_world_lessons"} for key,name,color,icon in WORLDS], "characters": [{"id": key, "name":name, "selectable":key != "guide"} for key,name in CHARACTERS], "assets": items}
    (ROOT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+"\n")
    groups = {}
    for item in items:
        groups.setdefault(item["category"], []).append(item)
    titles = {"characters":"الشخصيات والمرشد", "worlds":"العوالم السبعة", "badges":"شارات إكمال العوالم", "rewards":"النجوم والمكافآت", "icons":"أيقونات الواجهة والأنشطة", "audio/guide":"صوت المرشد — تجريبي", "audio/effects":"مؤثرات بلا موسيقى"}
    sections = []
    scripts = json.loads((ROOT / "audio" / "guide-scripts.json").read_text()) if (ROOT / "audio" / "guide-scripts.json").exists() else []
    speech = {s["id"]: s["text"] for s in scripts}
    for group in ["characters", "worlds", "badges", "rewards", "icons", "audio/guide", "audio/effects"]:
        cards = []
        for item in groups.get(group, []):
            p, label = html.escape(item["path"], quote=True), html.escape(item["label"])
            if group.startswith("audio/"):
                media = f'<audio controls preload="none" aria-label="{label}"><source src="{p}"></audio><p>{html.escape(speech.get(Path(p).stem, "مؤثر تجريبي بانتظار المراجعة"))}</p>'
            else:
                media = f'<img src="{p}" alt="{label}" loading="lazy">'
            cards.append(f'<article>{media}<h3>{label}</h3><a href="{p}" download>تنزيل الملف</a><small dir="ltr">{p}</small></article>')
        sections.append(f'<section id="{group.replace("/", "-")}"><h2>{titles[group]} <span>{len(cards)}</span></h2><div class="grid {group.split("/")[0]}">{"".join(cards)}</div></section>')
    page = '''<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>مكتبة أصول رحلة التعلّم</title><style>
    *{box-sizing:border-box}body{margin:0;background:#fbf7ef;color:#203e3b;font:17px/1.8 system-ui,sans-serif}main{max-width:1320px;margin:auto;padding:28px}header{padding:44px 0;border-bottom:1px solid #d9ddcf}h1{font-size:clamp(30px,5vw,54px);margin:0}header p{max-width:820px}nav{display:flex;gap:10px;flex-wrap:wrap}a{color:#215f5b;display:inline-flex;align-items:center;min-height:44px;padding:6px 12px;border:1px solid #b8cbc0;border-radius:12px;text-decoration:none}a:hover{background:#e3eee5}a:focus-visible,audio:focus-visible{outline:3px solid #975129;outline-offset:3px}section{margin:48px 0}h2 span{font-size:16px;color:#637c6c}h3{font-size:17px;margin:8px 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px}article{background:#fffdf8;border:1px solid #e4e4d6;border-radius:22px;padding:16px;overflow:hidden}img{width:100%;height:215px;object-fit:contain}.worlds{grid-template-columns:repeat(auto-fit,minmax(320px,1fr))}.worlds img{height:auto;aspect-ratio:3/2;object-fit:cover;border-radius:14px}.icons img,.badges img,.rewards img{height:110px}.icons{grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}small{display:block;overflow-wrap:anywhere;font-size:12px;color:#61736d;margin-top:10px}audio{width:100%}.note{background:#f1e8d6;border-radius:16px;padding:16px}@media(max-width:420px){main{padding:16px}.worlds{grid-template-columns:1fr}}
    </style><main><header><small>تعليم الأطفال الإسلام · مكتبة الإنتاج</small><h1>كل رحلة تبدأ بخيال جميل</h1><p>شخصيات أصلية وعوالم هادئة ومكافآت تشجع التعلّم. ملفات محلية قابلة للتنزيل والاستخدام عند بناء التطبيق.</p><p class="note">حزمة للمراجعة، وليست محتوى منشورًا أو منهجًا مكتملًا. صوت المرشد آلي تجريبي؛ لا توجد تلاوات مصطنعة أو موسيقى. راجع README لمعرفة المواد المتبقية والحقوق.</p><nav>'''
    page += ''.join(f'<a href="#{k.replace("/", "-")}">{v}</a>' for k,v in titles.items()) + '</nav></header>' + ''.join(sections)
    page += '<footer><a href="manifest.json">فهرس الأصول</a> <a href="README.md">ملاحظات الإنتاج والحقوق</a></footer></main><script>document.addEventListener("play",event=>{if(event.target instanceof HTMLMediaElement){document.querySelectorAll("audio").forEach(audio=>{if(audio!==event.target)audio.pause()})}},true)</script></html>'
    (ROOT / "index.html").write_text(page)
    print(f"Built catalogue: {len(items)} assets")


if __name__ == "__main__":
    build_vectors()
    build_effects()
    build_catalogue()
