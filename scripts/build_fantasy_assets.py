"""Draw the additive fantasy SVG collection. Never writes outside assets/fantasy/."""
from pathlib import Path
import html
import json
from build_assets import ICONS, STAR

ROOT = Path(__file__).resolve().parents[1] / "assets" / "fantasy"
CATALOG = json.loads((ROOT / "catalog.json").read_text())


def save(group, name, title, body, viewbox="0 0 240 240"):
    path = ROOT / group / f"{name}.svg"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}" role="img" aria-labelledby="title">'
        f'<title id="title">{html.escape(title)}</title>{body}</svg>\n'
    )


DEFS = """
<defs>
 <linearGradient id="gold" x2=".3" y2="1"><stop stop-color="#fff1ac"/><stop offset=".5" stop-color="#f8ca69"/><stop offset="1" stop-color="#df954e"/></linearGradient>
 <linearGradient id="mint" x2=".7" y2="1"><stop stop-color="#daf8d8"/><stop offset="1" stop-color="#68baa9"/></linearGradient>
 <linearGradient id="lilac" x2=".6" y2="1"><stop stop-color="#eadfff"/><stop offset="1" stop-color="#9b81c4"/></linearGradient>
 <linearGradient id="pearl" x2=".7" y2="1"><stop stop-color="#fffdf3"/><stop offset=".5" stop-color="#f3e6f1"/><stop offset="1" stop-color="#c0c8e9"/></linearGradient>
 <linearGradient id="rock" x2=".1" y2="1"><stop stop-color="#909dcd"/><stop offset="1" stop-color="#555781"/></linearGradient>
 <linearGradient id="water" x2=".4" y2="1"><stop stop-color="#c7fff5"/><stop offset="1" stop-color="#69bfda" stop-opacity=".2"/></linearGradient>
 <radialGradient id="glow"><stop stop-color="#fff8c5" stop-opacity=".8"/><stop offset="1" stop-color="#fff8c5" stop-opacity="0"/></radialGradient>
 <g id="spark" fill="#fff6cb"><path d="M0-12 3-3 12 0 3 3 0 12-3 3-12 0-3-3Z"/></g>
 <g id="cloud" fill="#fff" opacity=".65"><ellipse cy="8" rx="80" ry="20"/><circle cx="-30" r="28"/><circle cx="12" cy="-15" r="35"/><circle cx="48" cy="2" r="23"/></g>
 <g id="island"><path d="M-126 0Q-78 94 0 106 79 87 126 0Z" fill="url(#rock)"/><path d="m-70 28 48 64 24-56 32 52 44-66" fill="none" stroke="#b9b7de" stroke-width="3" opacity=".3"/><ellipse rx="128" ry="38" fill="url(#mint)"/><path d="M-100-5q92-38 185 0" fill="none" stroke="#e2f9d5" stroke-width="8" stroke-linecap="round"/></g>
 <g id="tree"><path d="M0 0q-4-53 7-108M1-48l-22-23m22 9 26-25" fill="none" stroke="#817085" stroke-width="9" stroke-linecap="round"/><ellipse cx="-13" cy="-106" rx="41" ry="48" fill="url(#lilac)"/><ellipse cx="21" cy="-115" rx="30" ry="43" fill="#ecc4dc"/><path d="M-25-116q4-20 16-27" fill="none" stroke="#fff2ee" stroke-width="5" stroke-linecap="round"/></g>
 <g id="sprout"><path d="M0 0v-32" stroke="#599f8e" stroke-width="5"/><path d="M0-18Q-40-14-32-46 0-45 0-18M0-26Q31-53 35-29 20-14 0-26" fill="url(#mint)"/></g>
 <g id="crystal"><path d="M0-83 29-51 22 0-21 0-28-52Z" fill="url(#lilac)" stroke="#eee3ff" stroke-width="2"/><path d="M0-83-8-42 0 0 10-44Z" fill="#f6eaff" opacity=".7"/><path d="m-28-52 20 10 18-2 19-7" fill="none" stroke="#f6eaff" stroke-width="2"/></g>
 <g id="book"><path d="M-58-22Q-22-35 0-16 26-35 58-22V30Q27 15 0 35-27 15-58 30Z" fill="url(#pearl)" stroke="#9b81bc" stroke-width="4"/><path d="M0-15v49" stroke="#ac96c7" stroke-width="3"/><path d="M-47-11q20-4 35 4M12-7q16-8 35-4M-47 1q20-4 35 4M12 5q16-8 35-4" fill="none" stroke="#d1bfe4" stroke-width="3" stroke-linecap="round"/></g>
 <g id="door"><path d="M-38 0v-66a38 38 0 0 1 76 0V0Z" fill="url(#pearl)" stroke="#fff3eb" stroke-width="9"/><path d="M-23 0v-61a23 23 0 0 1 46 0V0Z" fill="#9acbbf"/><circle cx="12" cy="-25" r="4" fill="#fff1ae"/></g>
 <g id="flower"><path d="M0 0v-52" stroke="#69a68b" stroke-width="6"/><g transform="translate(0 -63)" fill="#f5bdd0"><ellipse cy="-13" rx="14" ry="23"/><ellipse cy="13" rx="14" ry="23"/><ellipse cx="-13" rx="23" ry="14"/><ellipse cx="13" rx="23" ry="14"/><circle r="12" fill="url(#gold)"/></g></g>
</defs>
"""


def use(name, x, y, scale=1):
    return f'<use href="#{name}" transform="translate({x} {y}) scale({scale})"/>'


def world_scene(world, index):
    sky = ["#b6dcd6", "#eec8d8", "#c5dbce", "#afd4e8", "#b7acd9", "#d6b4d5", "#b8b9e3"][index]
    body = DEFS + f'<defs><linearGradient id="sky" x2=".2" y2="1"><stop stop-color="{sky}"/><stop offset="1" stop-color="#fff0e2"/></linearGradient></defs><path fill="url(#sky)" d="M0 0h900v600H0Z"/>'
    body += '<circle cx="674" cy="135" r="115" fill="url(#glow)"/><circle cx="674" cy="135" r="47" fill="#fff2c5" opacity=".85"/><ellipse cx="455" cy="548" rx="237" ry="23" fill="#8c80ae" opacity=".12"/>'
    for x, y, scale in [(80, 165, 1.2), (796, 279, 1.4), (140, 509, 1.9), (730, 530, 1.8), (380, 66, .7)]:
        body += use("cloud", x, y, scale)
    for x, y, scale in [(115, 330, .45), (759, 337, .55), (798, 136, .26)]:
        body += use("island", x, y, scale) + use("sprout", x, y - 4, scale)
    body += use("island", 453, 386, 1.92)
    body += '<path d="M488 412c-180-26 120-34-3-71" fill="none" stroke="#f8edcf" stroke-width="24" stroke-linecap="round"/>'
    if index == 0:
        body += use("tree", 298, 359, 1.25) + use("tree", 601, 347, .85)
        body += '<path d="M423 332V232q44-54 87 0v100" fill="url(#pearl)"/><path d="M439 331v-83q28-34 55 0v83" fill="#6faba5"/><path d="m413 232 54-75 55 75Z" fill="url(#gold)"/>'
        for x, y in [(284, 201), (615, 223), (363, 295)]:
            body += f'<ellipse cx="{x}" cy="{y}" rx="12" ry="17" fill="url(#gold)"/>' + use("spark", x+21, y-18, .55)
    elif index == 1:
        for x, y, scale, color in [(335, 355, 1.1, "#efb1c3"), (505, 323, .95, "#e8b9db"), (624, 364, .72, "#f3c993")]:
            body += f'<g transform="translate({x} {y}) scale({scale})"><path d="M-65 0v-84q65-48 130 0V0Z" fill="{color}"/><path d="M-79-83Q-71-169 0-170 71-169 79-83Z" fill="url(#pearl)"/><circle cy="-122" r="16" fill="#c4bdde"/>{use("door",0,0,.65)}</g>'
        body += use("flower", 236, 375, .8)
    elif index == 2:
        body += '<path d="M224 341q214-218 455 0M230 346q208-168 441 0" fill="none" stroke="#7ca88d" stroke-width="10"/><path d="M279 304v-19m39-8v-20m43 8v-20m44 12v-20m44 16v-20m44 20v-20m44 26v-20m44 32v-20m40 42v-20" stroke="#dceac3" stroke-width="6"/>'
        body += use("flower", 325, 344, 1.55) + use("flower", 581, 356, 1.15) + use("sprout", 237, 384, 1.6) + use("sprout", 669, 389, 1.1)
        body += '<path d="M461 220c-68-48-60-102-19-99q21 0 29 19 20-37 49-16 44 38-59 96" fill="#f0acbe"/>'
    elif index == 3:
        body += '<ellipse cx="454" cy="367" rx="130" ry="40" fill="url(#pearl)"/><ellipse cx="454" cy="364" rx="111" ry="29" fill="#8bcec9"/><ellipse cx="454" cy="361" rx="76" ry="15" fill="none" stroke="#d8f8ea" stroke-width="3"/>'
        for x, y, scale in [(297, 349, 1.25), (447, 300, 1.5), (606, 349, 1.25)]:
            body += use("door", x, y, scale)
        body += '<path d="M417 395q-14 68 5 152h48q-21-72 2-147" fill="url(#water)"/>'
        for x, y in [(334, 211), (572, 201), (502, 141)]:
            body += f'<path d="M{x} {y}q-27 34 0 35 27-1 0-35" fill="url(#water)" stroke="#e6fff7" stroke-width="2"/>'
    elif index == 4:
        body += '<path d="M262 343C154 202 297 106 342 184 345 71 459 90 466 169 513 69 613 132 591 201 712 161 748 272 639 343Z" fill="url(#pearl)" stroke="#f5e6f9" stroke-width="5"/><path d="m268 258 156 98m-82-172 91 157m33-172-17 168m142-136-116 138m184-53-167 59" stroke="#cabadd" stroke-width="3" fill="none"/>'
        for y in [251, 302]:
            body += f'<path d="M327 {y}h249" stroke="#947cad" stroke-width="10" stroke-linecap="round"/>'
            for j in range(7):
                body += f'<rect x="{340+j*32}" y="{y-37-j%2*7}" width="22" height="{35+j%2*7}" rx="4" fill="{["#98cabd","#e8b1c5","#c5b0df","#ebca8d"][j%4]}"/><path d="M{346+j*32} {y-29}v20" stroke="#fff4ef" stroke-width="2"/>'
        body += use("book", 451, 367, .8)
    elif index == 5:
        body += use("book", 452, 349, 2.8)
        for x, y, scale in [(308, 312, 1), (582, 299, .85)]:
            body += f'<g transform="translate({x} {y}) scale({scale})"><path d="M-17 0v-103h34V0" fill="url(#pearl)"/><path d="M-74-98q12-105 74-105t74 105Z" fill="#e9b7c6"/><circle cx="-29" cy="-128" r="13" fill="#fff0dd"/><circle cx="23" cy="-157" r="10" fill="#fff0dd"/><circle cx="41" cy="-117" r="8" fill="#fff0dd"/></g>'
        body += '<path d="M420 308V203h62v105" fill="#c2b0dd"/><path d="m409 206 42-65 42 65" fill="url(#gold)"/><rect x="438" y="237" width="25" height="41" rx="12" fill="#fff1df"/>'
    else:
        for x, y, scale in [(288, 362, 1.05), (336, 314, 1.3), (408, 290, 1.45), (492, 280, 1.85), (567, 309, 1.4), (622, 352, 1.15), (517, 387, .75)]:
            body += use("crystal", x, y, scale)
        body += '<path d="M281 391q131-63 321 7" fill="none" stroke="#eee9ff" stroke-width="12" stroke-linecap="round" stroke-dasharray="12 22"/>'
    for x, y, scale in [(193, 104, .75), (570, 77, .6), (748, 418, .7), (366, 159, .55), (157, 414, .45), (695, 252, .5)]:
        body += use("spark", x, y, scale)
    body += use("sprout", 338, 418, .65) + use("sprout", 573, 426, .7)
    save("worlds", world["id"], world["name"], body, "0 0 900 600")


def emblem(icon, color="#73618e"):
    return f'<g transform="translate(77 62) scale(1.34)" fill="none" stroke="{color}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">{ICONS[icon][1]}</g>'


def build():
    for index, world in enumerate(CATALOG["worlds"]):
        world_scene(world, index)
        icon = ["sun", "door", "heart", "water", "book", "palm", "repeat"][index]
        for state in ["earned", "locked"]:
            color = world["color"] if state == "earned" else "#b3b4c1"
            body = DEFS + f'<path d="m75 141-20 76 42-15 23 23 10-76m-1 0 14 76 22-23 40 15-22-76" fill="{color}"/><path d="M120 17 145 29 175 30 188 56 211 76 207 106 213 135 190 156 176 182 145 181 120 196 93 182 64 180 49 156 28 136 32 106 27 76 50 57 64 30 95 29Z" fill="url(#gold)"/><circle cx="120" cy="107" r="73" fill="{color}" stroke="#fff0ba" stroke-width="5"/><circle cx="120" cy="107" r="62" fill="url(#pearl)"/>'
            body += emblem(icon if state == "earned" else "lock") + use("spark", 192, 35, .8) + use("spark", 42, 172, .55)
            save("badges", f'{world["id"]}-{state}', f'شارة {world["name"]} — {"مكتسبة" if state == "earned" else "مقفلة"}', body)
    star = '<g transform="translate(15 11) scale(3.25)" fill="url(#gold)" stroke="#eab86e" stroke-width="1.2">' + STAR + '</g>'
    for state in ["earned", "empty"]:
        body = DEFS + star
        if state == "empty":
            body = body.replace('fill="url(#gold)"', 'fill="#e2deeb"').replace('stroke="#eab86e"', 'stroke="#bcb3cd"')
        save("rewards", f"star-{state}", "نجمة مكتسبة" if state == "earned" else "نجمة فارغة", body)
    for count in range(4):
        body = DEFS
        for i in range(3):
            body += f'<g transform="translate({i*75} 6) scale(1.05)" fill="{"url(#gold)" if i < count else "#e2deeb"}" stroke="#ae91ad" stroke-width="1">{STAR}</g>'
        save("rewards", f"stars-{count}", f"{count} من ثلاث نجوم", body, "0 0 225 76")
    trophy = '<path d="M75 63H45v21q0 50 51 49m69-70h30v21q0 50-51 49" fill="none" stroke="#e5af63" stroke-width="14"/><path d="M73 45h94v53a47 47 0 0 1-94 0Z" fill="url(#gold)" stroke="#efc784" stroke-width="3"/><path d="M120 145v44" stroke="#d6a467" stroke-width="16"/><path d="M82 196q38-24 76 0v12H82Z" fill="url(#lilac)"/><g transform="translate(98 64) scale(.7)" fill="#fff7d6">' + STAR + '</g>'
    save("rewards", "world-complete", "كأس الجزيرة", DEFS + trophy + use("spark", 191, 39, 1) + use("spark", 42, 167, .7))
    save("rewards", "celebration", "احتفال النجوم والسحب", DEFS + use("cloud", 120, 184, 1.1) + '<g transform="translate(15 -10)">' + star + '</g>' + ''.join(use("spark", x, y, s) for x,y,s in [(30,43,.8),(203,46,.9),(28,139,.5),(214,151,.55)]))
    objects = {
        "lantern": '<path d="M97 66V44a23 23 0 0 1 46 0v22" fill="none" stroke="#b398bb" stroke-width="7"/><path d="m79 67-12 98 53 28 53-28-12-98Z" fill="url(#lilac)" stroke="#cfb4dc" stroke-width="4"/><path d="m92 77-8 78 36 21 36-21-8-78Z" fill="#fff0be"/><path d="M71 67h98M64 165h112" stroke="#c6a4c9" stroke-width="8" stroke-linecap="round"/><g transform="translate(100 101) scale(.65)" fill="url(#gold)">'+STAR+'</g>',
        "compass": '<circle cx="120" cy="45" r="17" fill="none" stroke="#cba27b" stroke-width="8"/><circle cx="120" cy="129" r="79" fill="url(#gold)"/><circle cx="120" cy="129" r="65" fill="url(#pearl)" stroke="#fff3c5" stroke-width="4"/><path d="m146 82-8 65-45 31 10-67Z" fill="url(#lilac)"/><path d="m146 82-25 47-18-18Z" fill="#77c4b0"/><circle cx="120" cy="130" r="8" fill="#fff4c5"/><path d="M120 76v9m0 88v9M68 129h9m86 0h9" stroke="#a18ead" stroke-width="4" stroke-linecap="round"/>',
        "key": '<g transform="rotate(-35 120 120)"><path d="M120 96v110m0-18h30v-20h-30" fill="none" stroke="#deb078" stroke-width="18" stroke-linejoin="round"/><circle cx="120" cy="76" r="43" fill="url(#gold)" stroke="#fce3a7" stroke-width="4"/><path d="m120 50 10 17 20 9-20 10-10 18-10-18-20-10 20-9Z" fill="url(#lilac)"/></g>',
        "chest": '<path d="M43 115v76q77 39 154 0v-76" fill="url(#lilac)" stroke="#c6acd9" stroke-width="4"/><path d="M43 115V94a77 55 0 0 1 154 0v21Z" fill="url(#mint)" stroke="#a5d6ba" stroke-width="4"/><path d="M45 118h150M68 65v139m104-139v139" stroke="#f3d495" stroke-width="11"/><rect x="104" y="103" width="32" height="44" rx="9" fill="url(#gold)"/><circle cx="120" cy="118" r="6" fill="#987b9e"/><path d="M120 120v12" stroke="#987b9e" stroke-width="5"/>'
    }
    for item in CATALOG["objects"]:
        save("objects", item["id"], item["name"], DEFS + '<ellipse cx="120" cy="217" rx="64" ry="9" fill="#c3b4db" opacity=".2"/>' + objects[item["id"]] + use("spark", 199, 41, .8) + use("spark", 35, 64, .5))
    activities = {
        "choice": use("island", 120, 179, .77) + use("door", 91, 166, 1.1) + '<path d="m143 107 19 19 37-42" stroke="#f4cc83" stroke-width="13" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
        "match": use("island", 61, 155, .4) + use("island", 182, 121, .4) + '<path d="M71 151q81 20 104-37" fill="none" stroke="#eabf88" stroke-width="12" stroke-dasharray="4 10"/>' + use("crystal", 60, 148, .6) + use("crystal", 183, 114, .6),
        "order": ''.join(use("cloud", x, y, .48) + use("crystal", x, y-8, .33) for x,y in [(58,176),(121,128),(179,77)]) + '<path d="M62 135q8-25 32-23m33-35q10-23 30-20" stroke="#bda0cd" stroke-width="4" stroke-dasharray="4 7" fill="none"/>',
        "story": use("cloud", 121, 184, 1.1) + use("book", 120, 131, 1.4) + use("tree", 62, 102, .4) + use("spark", 143, 61, 1.2)
    }
    for item in CATALOG["activities"]:
        save("activities", item["id"], item["name"], DEFS + activities[item["id"]] + use("spark", 206, 43, .6))
    print("Built 37 fantasy SVGs; all original collections preserved.")


if __name__ == "__main__":
    build()
