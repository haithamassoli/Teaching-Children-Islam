import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const icon = await readFile(new URL("../public/icon.svg", import.meta.url));
for (const [file, size] of [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["apple-touch-icon.png", 180],
]) {
  await sharp(icon).resize(size, size).png().toFile(`public/${file}`);
}
const maskable = Buffer.from(
  icon
    .toString()
    .replace('rx="112"', 'rx="0"')
    .replace("<path", '<g transform="translate(51.2 51.2) scale(.8)"><path')
    .replace("</svg>", "</g></svg>"),
);
await sharp(maskable).png().toFile("public/icon-maskable.png");
const png = await sharp(icon).resize(32, 32).png().toBuffer();
const header = Buffer.alloc(22);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
header[6] = header[7] = 32;
header.writeUInt16LE(1, 10);
header.writeUInt16LE(32, 12);
header.writeUInt32LE(png.length, 14);
header.writeUInt32LE(22, 18);
await writeFile("app/favicon.ico", Buffer.concat([header, png]));
const logo = icon.toString().replace("<svg ", '<svg x="488" y="68" width="224" height="224" ');
const card = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#fffaf0"/><circle cx="40" cy="20" r="240" fill="#e2f1e9"/><circle cx="1180" cy="620" r="260" fill="#fae5bf"/>
<rect x="36" y="36" width="1128" height="558" rx="36" fill="none" stroke="#21695d" stroke-opacity=".18" stroke-width="2"/>
${logo}
<g font-family="Tahoma, Arial, sans-serif" text-anchor="middle">
<text x="600" y="385" font-size="64" font-weight="bold" fill="#1d3654" direction="rtl">رِحلة الإسلام</text>
<text x="600" y="448" font-size="32" fill="#21695d" direction="rtl">نتعلّم ونكبر على الخير</text>
<text x="600" y="518" font-size="23" fill="#1d3654" direction="rtl">تعليم الأطفال الإسلام · من ٦ إلى ١٠ سنوات · بإشراف الوالدين</text>
</g></svg>`;
await sharp(Buffer.from(card)).png().toFile("app/opengraph-image.png");
await sharp(Buffer.from(card)).png().toFile("app/twitter-image.png");
