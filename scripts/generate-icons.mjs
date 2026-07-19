// 依存ライブラリなしで PWA 用アイコン PNG を生成する。
// デザイン: 濃緑の角丸背景 + 白い円(グリーン) + 赤い旗。
// 実行: node scripts/generate-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT_DIR = new URL('../public/', import.meta.url);
mkdirSync(OUT_DIR, { recursive: true });

// --- CRC32 ---
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

// --- 幾何ヘルパ（座標は 0..1 正規化） ---
function inRoundedRect(x, y, r) {
  const dx = Math.max(Math.abs(x - 0.5) - (0.5 - r), 0);
  const dy = Math.max(Math.abs(y - 0.5) - (0.5 - r), 0);
  return dx * dx + dy * dy <= r * r;
}
function inCircle(x, y, cx, cy, rad) {
  return (x - cx) ** 2 + (y - cy) ** 2 <= rad * rad;
}
function inTriangle(px, py, a, b, c) {
  const sign = (p1, p2, p3) =>
    (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1]);
  const d1 = sign([px, py], a, b);
  const d2 = sign([px, py], b, c);
  const d3 = sign([px, py], c, a);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

function pixel(x, y) {
  // 返り値 [r,g,b,a]
  if (!inRoundedRect(x, y, 0.2)) return [0, 0, 0, 0];
  let col = [26, 92, 58]; // 濃緑背景
  if (inCircle(x, y, 0.5, 0.58, 0.27)) col = [255, 255, 255]; // グリーン(白円)
  // 旗のポール
  if (x >= 0.485 && x <= 0.505 && y >= 0.22 && y <= 0.6) col = [230, 230, 230];
  // 旗（赤い三角）
  if (inTriangle(x, y, [0.505, 0.225], [0.7, 0.285], [0.505, 0.345]))
    col = [224, 32, 32];
  return [col[0], col[1], col[2], 255];
}

function makePng(size) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  let p = 0;
  for (let y = 0; y < size; y++) {
    raw[p++] = 0; // filter type 0
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel((x + 0.5) / size, (y + 0.5) / size);
      raw[p++] = r;
      raw[p++] = g;
      raw[p++] = b;
      raw[p++] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const [name, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
]) {
  writeFileSync(new URL(name, OUT_DIR), makePng(size));
  console.log('wrote', name, size + 'x' + size);
}
