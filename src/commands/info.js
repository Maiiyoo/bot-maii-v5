require('dotenv').config()
const axios  = require('axios')
const { getJadwal, setJadwal } = require('../database/db')

// ── CUACA ────────────────────────────────────────────
async function cuaca({ reply, text }) {
  if (!text) return reply('❌ Format: .cuaca [kota]\nContoh: .cuaca Bandung')
  try {
    const { data: d } = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params: { q: text, appid: process.env.OPENWEATHER_API_KEY, units: 'metric', lang: 'id' }
    })
    const emo = { Clear:'☀️',Clouds:'☁️',Rain:'🌧️',Drizzle:'🌦️',Thunderstorm:'⛈️',Snow:'❄️',Mist:'🌫️',Fog:'🌫️' }
    await reply(`╔══════════════════════════╗\n║   ${emo[d.weather[0].main]||'🌤️'} *CUACA ${d.name.toUpperCase()}*\n╚══════════════════════════╝\n\n📍 ${d.name}, ${d.sys.country}\n🌤️ ${d.weather[0].description}\n🌡️ Suhu    : *${Math.round(d.main.temp)}°C* (terasa ${Math.round(d.main.feels_like)}°C)\n💧 Lembab  : *${d.main.humidity}%*\n💨 Angin   : *${Math.round(d.wind.speed*3.6)} km/h*\n👁️ Visibil : *${(d.visibility/1000).toFixed(1)} km*`)
  } catch (e) {
    await reply(e.response?.status===404 ? `❌ Kota *${text}* tidak ditemukan.` : '❌ Gagal ambil data cuaca!')
  }
}

// ── GEMPA ────────────────────────────────────────────
async function gempa({ reply }) {
  try {
    const { data } = await axios.get('https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json')
    const g = data.Infogempa.gempa
    await reply(`╔══════════════════════════╗\n║   🌋 *GEMPA TERBARU*     ║\n╚══════════════════════════╝\n\n📅 ${g.Tanggal} ${g.Jam}\n📍 ${g.Wilayah}\n💥 Magnitudo : *${g.Magnitude} SR*\n🌊 Kedalaman : *${g.Kedalaman}*\n📍 Koordinat : ${g.Lintang}, ${g.Bujur}\n⚠️ Potensi   : _${g.Potensi}_\n\n_Data BMKG_ 🇮🇩`)
  } catch { await reply('❌ Gagal ambil data BMKG!') }
}

// ── BERITA ───────────────────────────────────────────
async function berita({ reply, text }) {
  const q = text || 'Indonesia'
  try {
    const { data } = await axios.get('https://newsapi.org/v2/everything', {
      params: { q, apiKey: process.env.NEWS_API_KEY, language:'id', pageSize:5, sortBy:'publishedAt' }
    })
    const arts = data.articles?.slice(0,5)
    if (!arts?.length) return reply('❌ Tidak ada berita.')
    let msg = `╔══════════════════════════╗\n║   📰 *BERITA TERKINI*    ║\n╚══════════════════════════╝\n\n🔍 Keyword: *${q}*\n\n`
    arts.forEach((a,i) => { msg += `*${i+1}. ${a.title}*\n📰 ${a.source.name} | ${new Date(a.publishedAt).toLocaleDateString('id-ID')}\n🔗 ${a.url}\n\n` })
    await reply(msg)
  } catch { await reply('❌ Gagal ambil berita!') }
}

// ── SHOLAT ───────────────────────────────────────────
async function sholat({ reply, text }) {
  if (!text) return reply('❌ Format: .sholat [kota]\nContoh: .sholat Bandung')
  try {
    const now  = new Date()
    const date = `${String(now.getDate()).padStart(2,'0')}-${String(now.getMonth()+1).padStart(2,'0')}-${now.getFullYear()}`
    const { data } = await axios.get(`https://api.aladhan.com/v1/timingsByCity/${date}`, {
      params: { city: text, country:'Indonesia', method:20 }
    })
    const t = data.data.timings
    await reply(`╔══════════════════════════╗\n║    🕌 *JADWAL SHOLAT*    ║\n╚══════════════════════════╝\n\n📍 *${text}*\n📅 ${now.toLocaleDateString('id-ID',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}\n\n🌅 Subuh   : *${t.Fajr}*\n☀️ Syuruq  : *${t.Sunrise}*\n🌤️ Dzuhur  : *${t.Dhuhr}*\n🌇 Ashar   : *${t.Asr}*\n🌆 Maghrib : *${t.Maghrib}*\n🌙 Isya    : *${t.Isha}*\n🌃 Imsak   : *${t.Imsak}*`)
  } catch { await reply(`❌ Kota *${text}* tidak ditemukan!`) }
}

// ── KURS ─────────────────────────────────────────────
async function kurs({ reply, text }) {
  try {
    const { data } = await axios.get('https://open.er-api.com/v6/latest/IDR')
    const rates    = data.rates
    const list     = text ? text.toUpperCase().split(/\s+/) : ['USD','SGD','MYR','EUR','JPY','CNY','AUD','GBP','SAR','KRW']
    let msg = `╔══════════════════════════╗\n║   💱 *KURS MATA UANG*   ║\n╚══════════════════════════╝\n\n📅 ${new Date().toLocaleDateString('id-ID')}\n\n`
    for (const cur of list) {
      if (rates[cur]) msg += `*${cur}* → Rp ${Math.round(1/rates[cur]).toLocaleString('id-ID')}\n`
    }
    await reply(msg)
  } catch { await reply('❌ Gagal ambil data kurs!') }
}

// ── ARTI KATA ────────────────────────────────────────
async function arti({ reply, text }) {
  if (!text) return reply('❌ Format: .arti [kata]\nContoh: .arti serendipity')
  try {
    const { data } = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(text)}`)
    const entry = data[0]
    let msg = `╔══════════════════════════╗\n║      📖 *KAMUS*          ║\n╚══════════════════════════╝\n\n📝 *${entry.word}*\n`
    if (entry.phonetic) msg += `🔊 _${entry.phonetic}_\n`
    msg += '\n'
    entry.meanings.slice(0,2).forEach((m,i) => {
      msg += `*${i+1}. ${m.partOfSpeech}*\n`
      m.definitions.slice(0,2).forEach(d => {
        msg += `   • ${d.definition}\n`
        if (d.example) msg += `   _"${d.example}"_\n`
      })
      msg += '\n'
    })
    await reply(msg)
  } catch { await reply(`❌ Kata *${text}* tidak ditemukan.`) }
}

// ── TRANSLATE ────────────────────────────────────────
async function translate({ reply, text, args }) {
  if (!text) return reply('❌ Format: .translate [teks]\nUntuk bahasa tertentu: .translate en halo dunia')
  const langs = ['id','en','ja','ko','zh','ar','fr','de','es','pt','ru','it','th','ms']
  let target = 'id', str = text
  if (langs.includes(args[0]?.toLowerCase())) { target = args.shift().toLowerCase(); str = args.join(' ') }
  if (!str) return reply('❌ Teks kosong!')
  try {
    const { data } = await axios.post('https://api.mymemory.translated.net/get', null, {
      params: { q: str, langpair: `auto|${target}` }
    })
    const hasil = data.responseData.translatedText
    await reply(`🌐 *TRANSLATE*\n\n📝 Asli:\n_${str}_\n\n✅ *${target.toUpperCase()}:*\n${hasil}`)
  } catch { await reply('❌ Gagal menerjemahkan!') }
}

// ── OCR ──────────────────────────────────────────────
async function ocr({ reply, msg, sock }) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
  const imgMsg = quoted?.imageMessage || msg.message?.imageMessage
  if (!imgMsg) return reply('❌ Reply/kirim foto dengan caption *.ocr*')
  try {
    await reply('⏳ Membaca teks...')
    const { downloadMediaMessage } = require('@whiskeysockets/baileys')
    let buffer
    if (quoted) {
      // Untuk quoted message, buat objek msg sintetis dengan pesan quoted
      buffer = await downloadMediaMessage(
        { message: quoted, key: { ...msg.key, id: msg.message?.extendedTextMessage?.contextInfo?.stanzaId || msg.key.id } },
        'buffer', {}, { logger: require('pino')({level:'silent'}) }
      )
    } else {
      buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger: require('pino')({level:'silent'}) })
    }
    const base64  = buffer.toString('base64')
    const { data } = await axios.post('https://api.ocr.space/parse/image', {
      base64Image: `data:image/jpeg;base64,${base64}`, language:'id', isOverlayRequired:false
    }, { headers: { apikey: process.env.OCR_API_KEY, 'Content-Type':'application/json' } })
    const parsed = data.ParsedResults?.[0]?.ParsedText?.trim()
    if (!parsed) return reply('❌ Tidak ada teks terdeteksi!')
    await reply(`╔══════════════════════════╗\n║  🔍 *HASIL BACA TEKS*    ║\n╚══════════════════════════╝\n\n${parsed}`)
  } catch { await reply('❌ Gagal membaca teks dari gambar!') }
}

// ── CEK IP ───────────────────────────────────────────
async function cekip({ reply, text, isOwner }) {
  if (text && !isOwner) return reply('⚠️ Hanya *owner* yang bisa cek IP orang lain!\nKetik *.ip* tanpa parameter untuk cek IP publik.')
  try {
    const url = text ? `https://ipinfo.io/${text.trim()}/json?token=${process.env.IPINFO_TOKEN}` : `https://ipinfo.io/json?token=${process.env.IPINFO_TOKEN}`
    const { data: d } = await axios.get(url)
    await reply(`╔══════════════════════════╗\n║      🌐 *INFO IP*        ║\n╚══════════════════════════╝\n\n🔢 IP       : *${d.ip}*\n🏙️ Kota     : *${d.city||'N/A'}*\n🗺️ Region   : *${d.region||'N/A'}*\n🌍 Negara   : *${d.country||'N/A'}*\n📍 Koordinat: ${d.loc||'N/A'}\n🏢 Org      : ${d.org||'N/A'}\n⏰ Timezone : ${d.timezone||'N/A'}`)
  } catch { await reply('❌ Gagal ambil info IP!') }
}

// ── LIRIK ────────────────────────────────────────────
async function lirik({ reply, text }) {
  if (!text) return reply('❌ Format: .lirik [judul] - [artis]\nContoh: .lirik Bohemian Rhapsody - Queen')
  const parts = text.split('-')
  if (parts.length < 2) return reply('❌ Format: .lirik [judul] - [artis]')
  const title = parts[0].trim(), artist = parts.slice(1).join('-').trim()
  try {
    const { data } = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`)
    if (!data.lyrics) return reply('❌ Lirik tidak ditemukan!')
    const txt = data.lyrics.length > 3000 ? data.lyrics.slice(0,3000) + '\n\n_...terpotong_' : data.lyrics
    await reply(`╔══════════════════════════╗\n║    🎵 *LIRIK LAGU*       ║\n╚══════════════════════════╝\n\n🎤 *${title}*\n👤 ${artist}\n\n${txt}`)
  } catch { await reply(`❌ Lirik *${title}* tidak ditemukan!`) }
}

// ── JADWAL (grup, bisa custom) ───────────────────────
async function jadwal({ reply, from, isGroup }) {
  const list = isGroup ? await getJadwal(from) : []
  const def  = [
    { hari:'Senin',  kegiatan:'Meeting grup 19.00' },
    { hari:'Rabu',   kegiatan:'Diskusi mingguan' },
    { hari:'Jumat',  kegiatan:'Game bareng 20.00' },
    { hari:'Minggu', kegiatan:'Evaluasi mingguan' },
  ]
  const jadwalList = list.length ? list : def
  const today = new Date().toLocaleDateString('id-ID',{weekday:'long'})
  let msg = `╔══════════════════════════╗\n║    📅 *JADWAL GRUP*      ║\n╚══════════════════════════╝\n\n`
  jadwalList.forEach(j => { msg += `${j.hari.toLowerCase()===today.toLowerCase()?'👉 ':''}*${j.hari}*: ${j.kegiatan}\n` })
  msg += `\n_Hari ini: ${today}_\n_Tambah jadwal: .tambahjadwal [hari] [kegiatan]_`
  await reply(msg)
}

async function tambahJadwal({ reply, from, isGroup, text }) {
  if (!isGroup) return reply('❌ Hanya di grup!')
  if (!text) return reply('❌ Format: .tambahjadwal [hari] [kegiatan]\nContoh: .tambahjadwal Senin Rapat jam 8')
  const parts = text.split(' ')
  if (parts.length < 2) return reply('❌ Format: .tambahjadwal [hari] [kegiatan]')
  const hari = parts[0]; const kegiatan = parts.slice(1).join(' ')
  const list = await getJadwal(from)
  const idx  = list.findIndex(j => j.hari.toLowerCase() === hari.toLowerCase())
  if (idx >= 0) list[idx].kegiatan = kegiatan; else list.push({ hari, kegiatan })
  await setJadwal(from, list)
  await reply(`✅ Jadwal *${hari}* diperbarui!\nKegiatan: _${kegiatan}_`)
}

async function hapusJadwal({ reply, from, isGroup, text }) {
  if (!isGroup) return reply('❌ Hanya di grup!')
  if (!text) return reply('❌ Format: .hapusjadwal [hari]\nContoh: .hapusjadwal Senin')
  const list    = await getJadwal(from)
  const newList = list.filter(j => j.hari.toLowerCase() !== text.toLowerCase())
  if (newList.length === list.length) return reply(`❌ Tidak ada jadwal hari *${text}*!`)
  await setJadwal(from, newList)
  await reply(`✅ Jadwal *${text}* dihapus!`)
}

// ── KALKULATOR ───────────────────────────────────────
async function kalkulator({ reply, text }) {
  if (!text) return reply('❌ Format: .calc [ekspresi]\nContoh: .calc 25 * 4 + 10')
  try {
    const cleaned = text.replace(/[^0-9+\-*/().\s%]/g,'')
    if (!cleaned) return reply('❌ Ekspresi tidak valid!')
    const hasil = Function('"use strict"; return (' + cleaned + ')')()
    await reply(`🧮 *KALKULATOR*\n\n📝 ${text}\n\n= *${hasil}*`)
  } catch { await reply('❌ Ekspresi tidak valid!') }
}

// ── BUAT QR CODE ─────────────────────────────────────
async function buatQR({ reply, text, sock, from, msg }) {
  if (!text) return reply('❌ Format: .qr [teks/link]\nContoh: .qr https://wa.me/6287883931360')
  try {
    await reply('⏳ Membuat QR code...')
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(text)}`
    const res = await axios.get(url, { responseType:'arraybuffer' })
    await sock.sendMessage(from, { image: Buffer.from(res.data), caption: `✅ QR Code untuk:\n_${text}_` }, { quoted: msg })
  } catch { await reply('❌ Gagal membuat QR code!') }
}

module.exports = { cuaca, gempa, berita, sholat, kurs, arti, translate, ocr, cekip, lirik, jadwal, tambahJadwal, hapusJadwal, kalkulator, buatQR }
