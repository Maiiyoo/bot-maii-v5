require('dotenv').config()
const axios = require('axios')

const history = new Map()
const MAX_H   = 10  // max 10 pasang pesan per user

// ── Groq API call ─────────────────────────────────────
async function callGroq(messages, retryModel = false) {
  const model = retryModel ? 'llama-3.1-8b-instant' : 'llama-3.3-70b-versatile'
  const { data } = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
    model,
    messages,
    max_tokens: 1024,
    temperature: 0.85
  }, {
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    timeout: 30000
  })
  return data.choices[0].message.content.trim()
}

// ── System prompt Maiilouve ───────────────────────────
function buildSystem(userName = '') {
  return `Kamu adalah Maiilouve 🌸, asisten WhatsApp yang ramah, cerdas, dan sedikit bercanda.

Kepribadian:
- Berbicara Bahasa Indonesia santai & natural seperti teman ngobrol
- Sesekali pakai emoji yang relevan (jangan berlebihan)
- Jawaban singkat & padat kecuali diminta panjang
- Bisa bercanda tapi tetap sopan
- Kalau ditanya hal sensitif, tolak dengan sopan
- Hindari markdown berlebihan (bold, italic) karena ini WhatsApp
- Kalau ada yang flirty atau caper, balas santai dan lucu

Info tentang kamu:
- Nama: Maiilouve Bot 🌸
- Owner (pemilik): Mayyy
- Kamu bot WhatsApp multifungsi dengan fitur ekonomi, game, info, download, dll
- Ketik .menu untuk lihat semua fitur
${userName ? `- Kamu sedang ngobrol dengan: ${userName}` : ''}

Ingat: Jawab natural, jangan kaku seperti robot!`
}

// ── CHAT via mention/reply/DM ─────────────────────────
async function chat(sock, msg, body, from, sender) {
  const clean = body.replace(/@\d+/g, '').trim()
  if (!clean) return

  // Ambil nama user dari DB kalau ada
  let userName = ''
  try {
    const { getUser, normalizeNumber } = require('../database/db')
    const u = await getUser(normalizeNumber(sender))
    userName = u.name || msg.pushName || ''
  } catch {}

  const key  = `${from}_${sender}`
  let hist   = history.get(key) || []

  hist.push({ role: 'user', content: clean })

  // Typing indicator
  try { await sock.sendPresenceUpdate('composing', from) } catch {}

  try {
    let reply
    try {
      reply = await callGroq([{ role: 'system', content: buildSystem(userName) }, ...hist])
    } catch (e) {
      // Kalau model utama error, coba model lebih kecil
      if (e.response?.status === 429 || e.response?.status === 503) {
        reply = await callGroq([{ role: 'system', content: buildSystem(userName) }, ...hist], true)
      } else throw e
    }

    hist.push({ role: 'assistant', content: reply })
    // Trim history setelah keduanya ditambahkan
    if (hist.length > MAX_H * 2) hist = hist.slice(-MAX_H * 2)
    history.set(key, hist)

    try { await sock.sendPresenceUpdate('paused', from) } catch {}
    await sock.sendMessage(from, { text: reply }, { quoted: msg })

  } catch (e) {
    try { await sock.sendPresenceUpdate('paused', from) } catch {}
    const errMsg = e.response?.data?.error?.message || e.message || 'Unknown error'
    console.error('❌ Groq error:', errMsg)

    // Pesan error yang friendly
    let userMsg = '❌ AI lagi sibuk, coba lagi sebentar ya!'
    if (e.response?.status === 401) userMsg = '❌ API key AI tidak valid! Hubungi owner.'
    else if (e.response?.status === 429) userMsg = '⏳ AI lagi banyak request, tunggu sebentar ya!'
    else if (e.code === 'ECONNABORTED') userMsg = '⏳ AI timeout, coba tanyain lagi!'

    await sock.sendMessage(from, { text: userMsg }, { quoted: msg })
  }
}

// ── .tanya command ────────────────────────────────────
async function tanya({ sock, msg, from, sender, text, reply }) {
  if (!text) return reply('❌ Format: .tanya [pertanyaan]\nContoh: .tanya apa itu black hole?')
  await reply('🤔 Berpikir...')
  await chat(sock, msg, text, from, sender)
}

// ── .resetai command ──────────────────────────────────
async function resetHistory({ reply, from, sender }) {
  const key = `${from}_${sender}`
  history.delete(key)
  await reply('✅ History AI direset!\nBisa mulai percakapan baru sekarang 🌸')
}

module.exports = { chat, tanya, resetHistory }
