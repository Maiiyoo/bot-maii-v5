const Jimp = require('jimp')
const { createCanvas } = require('@napi-rs/canvas')
const { downloadMediaMessage } = require('@whiskeysockets/baileys')
const pino = require('pino')

const logger = pino({ level: 'silent' })

// ── Download helper — handle quoted & non-quoted ──────
async function dlMedia(sock, msg) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage

  if (quoted) {
    // Buat sintetis message dari quoted
    const quotedKey = {
      remoteJid: msg.key.remoteJid,
      id: msg.message.extendedTextMessage.contextInfo.stanzaId,
      participant: msg.message.extendedTextMessage.contextInfo.participant,
      fromMe: false
    }
    const syntheticMsg = { message: quoted, key: quotedKey }
    try {
      return await downloadMediaMessage(syntheticMsg, 'buffer', {}, {
        logger,
        reuploadRequest: sock.updateMediaMessage
      })
    } catch {
      // fallback: coba pakai key asli
    }
  }

  return downloadMediaMessage(msg, 'buffer', {}, {
    logger,
    reuploadRequest: sock.updateMediaMessage
  })
}

// ── Deteksi tipe media ────────────────────────────────
function getMediaType(msg) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
  if (quoted?.imageMessage)   return 'image'
  if (quoted?.videoMessage)   return 'video'
  if (quoted?.stickerMessage) return 'sticker'
  if (msg.message?.imageMessage)   return 'image'
  if (msg.message?.videoMessage)   return 'video'
  if (msg.message?.stickerMessage) return 'sticker'
  return null
}

// ── FOTO/VIDEO → STIKER ──────────────────────────────
async function buatStiker({ reply, msg, sock, from }) {
  const mediaType = getMediaType(msg)

  if (!mediaType || mediaType === 'sticker')
    return reply('❌ Reply/kirim *foto atau video* dengan caption *.s*\n\nContoh:\n• Kirim foto + caption .s\n• Reply foto dengan .s')

  try {
    await reply('⏳ Membuat stiker...')
    const buffer = await dlMedia(sock, msg)

    if (mediaType === 'video') {
      // Video/GIF → stiker animasi pakai ffmpeg kalau ada, atau kirim apa adanya
      // Untuk video, WhatsApp bisa langsung terima sebagai stiker dengan mimetype webp
      // Tapi konversi video butuh ffmpeg — kita kirim sebagai stiker video biasa
      await sock.sendMessage(from, {
        sticker: buffer,
        mimetype: 'video/webp'
      }, { quoted: msg })
    } else {
      // Foto → stiker
      const image = await Jimp.read(buffer)
      // Resize 512x512 dengan padding transparan
      const size = 512
      const resized = image.contain(size, size)
      const webp = await resized.getBufferAsync('image/webp')
      await sock.sendMessage(from, { sticker: webp }, { quoted: msg })
    }
  } catch (e) {
    console.error('stiker err:', e.message)
    await reply('❌ Gagal buat stiker!\n\nPastikan:\n• File adalah foto/video valid\n• Ukuran tidak terlalu besar')
  }
}

// ── TEKS → STIKER ────────────────────────────────────
async function stikerTeks({ reply, text, sock, from, msg }) {
  if (!text) return reply('❌ Format: .st [teks]\nContoh: .st Selamat pagi! ☀️')
  try {
    await reply('⏳ Membuat stiker teks...')
    const size   = 512
    const canvas = createCanvas(size, size)
    const ctx    = canvas.getContext('2d')

    ctx.clearRect(0, 0, size, size)

    // Gradient background
    const grad = ctx.createLinearGradient(0, 0, size, size)
    grad.addColorStop(0, 'rgba(255,182,193,0.95)')
    grad.addColorStop(1, 'rgba(255,105,180,0.95)')
    ctx.fillStyle = grad
    roundRect(ctx, 16, 16, size-32, size-32, 40)
    ctx.fill()

    // Border putih
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'
    ctx.lineWidth = 6
    roundRect(ctx, 16, 16, size-32, size-32, 40)
    ctx.stroke()

    // Text
    const fs = text.length > 80 ? 24 : text.length > 50 ? 30 : text.length > 30 ? 38 : text.length > 15 ? 46 : 56
    ctx.font        = `bold ${fs}px sans-serif`
    ctx.fillStyle   = '#ffffff'
    ctx.textAlign   = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = 'rgba(0,0,0,0.3)'
    ctx.shadowBlur  = 4

    // Word wrap
    const words = text.split(' ')
    const lines = []
    let cur = ''
    for (const w of words) {
      const test = cur + (cur ? ' ' : '') + w
      if (ctx.measureText(test).width > size - 80 && cur) {
        lines.push(cur); cur = w
      } else cur = test
    }
    if (cur) lines.push(cur)

    const lh = fs * 1.4
    const th = lines.length * lh
    const sy = (size - th) / 2 + lh / 2
    lines.forEach((l, i) => ctx.fillText(l, size / 2, sy + i * lh))

    const pngBuf = canvas.toBuffer('image/png')
    const img = await Jimp.read(pngBuf)
    const webp = await img.getBufferAsync('image/webp')

    await sock.sendMessage(from, { sticker: webp }, { quoted: msg })
  } catch (e) {
    console.error('stikerTeks err:', e.message)
    await reply('❌ Gagal buat stiker teks!')
  }
}

// ── STIKER → FOTO ────────────────────────────────────
async function stikerKeGambar({ reply, msg, sock, from }) {
  const mediaType = getMediaType(msg)
  if (mediaType !== 'sticker')
    return reply('❌ Reply *stiker* dengan caption *.toimg*!')

  try {
    const buffer = await dlMedia(sock, msg)
    // Webp → Jimp → PNG
    const image = await Jimp.read(buffer)
    const png   = await image.getBufferAsync('image/png')
    await sock.sendMessage(from, {
      image: png,
      caption: '✅ Stiker → Gambar berhasil dikonversi!'
    }, { quoted: msg })
  } catch (e) {
    console.error('toimg err:', e.message)
    await reply('❌ Gagal konversi stiker ke gambar!')
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y);   ctx.quadraticCurveTo(x + w, y,     x + w, y + r)
  ctx.lineTo(x + w, y + h-r); ctx.quadraticCurveTo(x + w, y + h, x + w-r, y + h)
  ctx.lineTo(x + r, y + h);   ctx.quadraticCurveTo(x,     y + h, x,       y + h-r)
  ctx.lineTo(x, y + r);       ctx.quadraticCurveTo(x,     y,     x + r,   y)
  ctx.closePath()
}

module.exports = { buatStiker, stikerTeks, stikerKeGambar }
