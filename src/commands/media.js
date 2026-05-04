require('dotenv').config()
const axios = require('axios')

function ytId(url) {
  const m = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)
  return m ? m[1] : url
}

// ── YOUTUBE MP3 ──────────────────────────────────────
async function ytmp3({ reply, text, sock, from, msg }) {
  if (!text) return reply('❌ Format: .yt [link youtube]')
  if (!text.includes('youtube') && !text.includes('youtu.be')) return reply('❌ Link tidak valid!')
  await reply('⏳ Mengunduh audio YouTube...')
  try {
    const { data } = await axios.get('https://youtube-mp36.p.rapidapi.com/dl', {
      params: { id: ytId(text) },
      headers: { 'X-RapidAPI-Key': process.env.RAPIDAPI_KEY, 'X-RapidAPI-Host': 'youtube-mp36.p.rapidapi.com' }
    })
    if (data.status !== 'ok') return reply('❌ Gagal! Video terlalu panjang atau tidak tersedia.')
    await sock.sendMessage(from, {
      audio: { url: data.link }, mimetype:'audio/mpeg', fileName:`${data.title}.mp3`, ptt: false
    }, { quoted: msg })
    await reply(`✅ *${data.title}*\n⏱️ ${data.duration}`)
  } catch { await reply('❌ Gagal unduh YouTube audio!') }
}

// ── YOUTUBE MP4 ──────────────────────────────────────
async function ytmp4({ reply, text, sock, from, msg }) {
  if (!text) return reply('❌ Format: .ytmp4 [link youtube]')
  if (!text.includes('youtube') && !text.includes('youtu.be')) return reply('❌ Link tidak valid!')
  await reply('⏳ Mengunduh video YouTube...')
  try {
    const { data } = await axios.get('https://youtube-video-download-info.p.rapidapi.com/dl', {
      params: { id: ytId(text) },
      headers: { 'X-RapidAPI-Key': process.env.RAPIDAPI_KEY, 'X-RapidAPI-Host': 'youtube-video-download-info.p.rapidapi.com' }
    })
    if (!data || data.status !== 'ok') return reply('❌ Gagal ambil info video!')
    const preferred = ['360','480','720']
    let videoUrl = null
    for (const q of preferred) {
      if (data.link?.[q]?.[0]) { videoUrl = data.link[q][0][0]; break }
    }
    if (!videoUrl) return reply('❌ Format video tidak tersedia!')
    await sock.sendMessage(from, { video: { url: videoUrl }, caption: `🎬 *${data.title||'Video YouTube'}*` }, { quoted: msg })
  } catch { await reply('❌ Gagal unduh video YouTube!') }
}

// ── TIKTOK ───────────────────────────────────────────
async function tiktok({ reply, text, sock, from, msg }) {
  if (!text) return reply('❌ Format: .tt [link tiktok]')
  if (!text.includes('tiktok')) return reply('❌ Link tidak valid!')
  await reply('⏳ Mengunduh TikTok...')
  try {
    const { data } = await axios.get('https://tiktok-downloader-download-tiktok-videos-without-watermark.p.rapidapi.com/index', {
      params: { url: text },
      headers: { 'X-RapidAPI-Key': process.env.RAPIDAPI_KEY, 'X-RapidAPI-Host': 'tiktok-downloader-download-tiktok-videos-without-watermark.p.rapidapi.com' }
    })
    if (!data?.video) return reply('❌ Gagal unduh! Video mungkin privat.')
    const url = Array.isArray(data.video) ? data.video[0] : data.video
    await sock.sendMessage(from, { video: { url }, caption: `🎵 *${data.title||'TikTok Video'}*\n_No watermark_ ✅` }, { quoted: msg })
  } catch { await reply('❌ Gagal unduh TikTok!') }
}

// ── AI IMAGE (Pollinations) ──────────────────────────
async function imagine({ reply, text, sock, from, msg }) {
  if (!text) return reply('❌ Format: .imagine [deskripsi]\nContoh: .imagine kucing pakai topi astronot')
  await reply('🎨 Sedang generate gambar AI... (10-30 detik)')
  try {
    const seed = Math.floor(Math.random() * 99999)
    const url  = `https://image.pollinations.ai/prompt/${encodeURIComponent(text)}?seed=${seed}&width=512&height=512&nologo=true`
    const res  = await axios.get(url, { responseType:'arraybuffer', timeout: 60000 })
    await sock.sendMessage(from, {
      image: Buffer.from(res.data),
      caption: `🎨 *AI Generated*\n📝 _${text}_\n\n_Powered by Pollinations AI_ ✨`
    }, { quoted: msg })
  } catch { await reply('❌ Gagal generate gambar! Coba prompt lain.') }
}

module.exports = { ytmp3, ytmp4, tiktok, imagine }
