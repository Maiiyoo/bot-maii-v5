const { proto, downloadContentFromMessage } = require('@whiskeysockets/baileys')

/**
 * Ambil body teks dari pesan apapun
 */
function getMessageBody(msg) {
  const m = msg.message
  if (!m) return ''
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    m.buttonsResponseMessage?.selectedButtonId ||
    m.listResponseMessage?.singleSelectReply?.selectedRowId ||
    m.templateButtonReplyMessage?.selectedId ||
    ''
  )
}

/**
 * Ambil pesan yang di-quote
 */
function getQuotedMessage(msg) {
  return msg.message?.extendedTextMessage?.contextInfo?.quotedMessage || null
}

/**
 * Cek apakah pesan adalah gambar
 */
function isImage(msg) {
  return !!(
    msg?.imageMessage ||
    msg?.message?.imageMessage
  )
}

/**
 * Cek apakah pesan adalah stiker
 */
function isSticker(msg) {
  return !!(
    msg?.stickerMessage ||
    msg?.message?.stickerMessage
  )
}

/**
 * Cek apakah pesan adalah video
 */
function isVideo(msg) {
  return !!(
    msg?.videoMessage ||
    msg?.message?.videoMessage
  )
}

/**
 * Download media dari pesan
 */
async function downloadMedia(sock, msg) {
  const m = msg.message || msg
  const type = Object.keys(m)[0]
  const stream = await downloadContentFromMessage(m[type], type.replace('Message', ''))
  let buffer = Buffer.from([])
  for await (const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk])
  }
  return buffer
}

/**
 * Format waktu dari millisecond
 */
function formatTime(ms) {
  const detik = Math.floor(ms / 1000)
  const menit = Math.floor(detik / 60)
  const jam = Math.floor(menit / 60)
  if (jam > 0) return `${jam} jam ${menit % 60} menit`
  if (menit > 0) return `${menit} menit ${detik % 60} detik`
  return `${detik} detik`
}

/**
 * Format angka ke Rupiah style
 */
function formatKoin(n) {
  return n.toLocaleString('id-ID') + ' koin'
}

/**
 * Normalize nomor WA
 */
function normalizeNumber(jid) {
  let num = (jid || '').replace('@s.whatsapp.net', '').replace('@g.us', '').replace(/\D/g, '')
  if (num.startsWith('0')) num = '62' + num.slice(1)
  return num
}

/**
 * Delay / sleep
 */
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

/**
 * Random integer antara min dan max (inklusif)
 */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Pilih item random dari array
 */
function randItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * Truncate teks panjang
 */
function truncate(str, maxLen = 1000) {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen) + '...'
}

module.exports = {
  getMessageBody,
  getQuotedMessage,
  isImage,
  isSticker,
  isVideo,
  downloadMedia,
  formatTime,
  formatKoin,
  normalizeNumber,
  sleep,
  randInt,
  randItem,
  truncate
}
