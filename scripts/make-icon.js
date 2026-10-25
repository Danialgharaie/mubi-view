// Builds assets/icon.png and assets/icon.ico from assets/icon.svg.
// Needs `rsvg-convert` (librsvg). Run once after changing the SVG; outputs are committed.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const assets = path.join(__dirname, '..', 'assets');
const svg = path.join(assets, 'icon.svg');
const render = (size) => execFileSync('rsvg-convert', ['-w', size, '-h', size, svg]);

fs.writeFileSync(path.join(assets, 'icon.png'), render(512));

// ICO files may hold PNG images directly: 6-byte header, 16-byte entry per image, then data.
const sizes = [16, 24, 32, 48, 64, 128, 256];
const images = sizes.map(render);
const header = Buffer.alloc(6 + 16 * images.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(images.length, 4);
let offset = header.length;
images.forEach((img, i) => {
  const e = 6 + 16 * i;
  header.writeUInt8(sizes[i] % 256, e); // 0 means 256
  header.writeUInt8(sizes[i] % 256, e + 1);
  header.writeUInt16LE(1, e + 4); // color planes
  header.writeUInt16LE(32, e + 6); // bits per pixel
  header.writeUInt32LE(img.length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += img.length;
});
fs.writeFileSync(path.join(assets, 'icon.ico'), Buffer.concat([header, ...images]));
console.log('wrote assets/icon.png and assets/icon.ico');
