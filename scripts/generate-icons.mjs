/**
 * generate-icons.mjs
 *
 * Generates the Capsule Hub icon set (16 / 48 / 128 px) as real PNG files with
 * zero third-party dependencies. It rasterises a simple "capsule" glyph — a
 * rounded pill on an indigo→violet radial gradient — into an RGBA buffer and
 * encodes it as a PNG using only Node's built-in zlib.
 *
 * Why hand-roll a PNG encoder instead of pulling in `sharp`/`canvas`? Those
 * carry native binaries that complicate a "clone and build" experience for
 * reviewers. This keeps the repo install-anywhere with no post-install steps.
 *
 * Run via `npm run icons` (also wired to `prebuild`).
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'public', 'icons')

// ---- Tiny CRC32 (PNG chunk checksum) ---------------------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

/** Encode an RGBA Uint8Array (length = w*h*4) into a PNG Buffer. */
function encodePNG(rgba, w, h) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type: RGBA
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace

  // Prepend a 0 (filter type "none") byte to every scanline.
  const stride = w * 4
  const raw = Buffer.alloc((stride + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0
    Buffer.from(rgba.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1)
  }
  const idat = deflateSync(raw, { level: 9 })

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ---- Drawing helpers --------------------------------------------------------
function lerp(a, b, t) {
  return a + (b - a) * t
}

/** Draw the glyph at a given size and return an RGBA buffer. */
function drawIcon(size) {
  const rgba = new Uint8Array(size * size * 4) // transparent by default
  const cx = size / 2
  const cy = size / 2
  const maxR = size * 0.72

  // Rounded-square background with a radial indigo→violet gradient.
  const bgRadius = size * 0.28 // corner radius
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inside = insideRoundedRect(x, y, size, bgRadius)
      if (!inside) continue
      const d = Math.min(1, Math.hypot(x - cx, y - cy) / maxR)
      // indigo (99,102,241) -> violet (139,92,246)
      const r = Math.round(lerp(79, 139, d))
      const g = Math.round(lerp(70, 92, d))
      const b = Math.round(lerp(229, 246, d))
      setPx(rgba, size, x, y, r, g, b, 255)
    }
  }

  // The "capsule" pill: a tilted rounded bar drawn in white with a soft core.
  const pillLen = size * 0.5
  const pillThick = size * 0.2
  const angle = -Math.PI / 4 // 45°
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  const halfLen = pillLen / 2 - pillThick / 2
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Project point onto the pill's main axis and measure distance.
      const px = x - cx
      const py = y - cy
      let t = px * dx + py * dy
      t = Math.max(-halfLen, Math.min(halfLen, t))
      const nx = cx + t * dx
      const ny = cy + t * dy
      const dist = Math.hypot(x - nx, y - ny)
      const edge = pillThick / 2
      if (dist <= edge) {
        // anti-alias the last ~1px
        const a = Math.max(0, Math.min(1, edge - dist))
        blendPx(rgba, size, x, y, 255, 255, 255, Math.round(255 * a))
      }
    }
  }

  // A small divider dot in the middle to suggest "two contexts joined".
  const dotR = size * 0.055
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dist = Math.hypot(x - cx, y - cy)
      if (dist <= dotR) {
        const a = Math.max(0, Math.min(1, dotR - dist + 0.5))
        blendPx(rgba, size, x, y, 99, 102, 241, Math.round(255 * a))
      }
    }
  }

  return rgba
}

function insideRoundedRect(x, y, size, radius) {
  const min = 0
  const max = size - 1
  const rx = Math.min(Math.max(x, min + radius), max - radius)
  const ry = Math.min(Math.max(y, min + radius), max - radius)
  return Math.hypot(x - rx, y - ry) <= radius + 0.5
}

function setPx(rgba, size, x, y, r, g, b, a) {
  const i = (y * size + x) * 4
  rgba[i] = r
  rgba[i + 1] = g
  rgba[i + 2] = b
  rgba[i + 3] = a
}

function blendPx(rgba, size, x, y, r, g, b, a) {
  const i = (y * size + x) * 4
  const sa = a / 255
  const da = rgba[i + 3] / 255
  const outA = sa + da * (1 - sa)
  if (outA === 0) return
  rgba[i] = Math.round((r * sa + rgba[i] * da * (1 - sa)) / outA)
  rgba[i + 1] = Math.round((g * sa + rgba[i + 1] * da * (1 - sa)) / outA)
  rgba[i + 2] = Math.round((b * sa + rgba[i + 2] * da * (1 - sa)) / outA)
  rgba[i + 3] = Math.round(outA * 255)
}

// ---- Main -------------------------------------------------------------------
mkdirSync(OUT_DIR, { recursive: true })
for (const size of [16, 48, 128]) {
  const png = encodePNG(drawIcon(size), size, size)
  const file = join(OUT_DIR, `icon-${size}.png`)
  writeFileSync(file, png)
  console.log(`✓ wrote ${file} (${png.length} bytes)`)
}
console.log('Icon set generated.')
