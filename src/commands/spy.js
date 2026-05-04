/**
 * SPY GAME — Multi-player dengan host & join system
 * Min 3 pemain, Max 4 pemain
 * Host mulai → pemain join .spyjoin → host start .spy start
 */

const { getUser, updateUser, normalizeNumber } = require('../database/db')

// activeGames: Map<groupId, gameState>
const activeGames = new Map()

const LOKASI = [
  'Pizza','Pantai','Pesawat','Dokter','Sekolah','Bioskop','Supermarket',
  'Rumah Sakit','Perpustakaan','Kebun Binatang','Gunung','Hotel','Bank',
  'Restoran','Taman','Stasiun','Bandara','Museum','Pabrik','Kolam Renang',
  'Salon','Kantor Polisi','Pemadam Kebakaran','Kapal','Pasar Malam',
  'Gym','Penjara','Istana','Kapal Selam','Kebun Teh'
]

function randItem(arr) { return arr[Math.floor(Math.random() * arr.length)] }

// ── HANDLE .spy ───────────────────────────────────────
async function handleSpy({ sock, from, msg, reply, isGroup, senderNumber, user, args }) {
  if (!isGroup) return reply('❌ Game Spy hanya bisa dimainkan di grup!')

  const sub = (args[0] || '').toLowerCase()

  switch (sub) {
    case 'mulai': case 'buat': case 'host': return spyHost({ sock, from, msg, reply, senderNumber, user })
    case 'start': case 'main':              return spyStart({ sock, from, msg, reply, senderNumber })
    case 'vote':                            return spyVote({ sock, from, msg, reply, senderNumber, args })
    case 'selesai': case 'end': case 'stop': return spyEnd({ sock, from, msg, reply, senderNumber })
    case 'status': case 'info':             return spyStatus({ reply, from })
    case 'batal': case 'cancel':            return spyCancel({ reply, from, senderNumber })
    default:
      return reply(`🕵️ *SPY GAME — Cara Main*\n\n` +
        `1️⃣ Host buat room: *.spy mulai*\n` +
        `2️⃣ Pemain join: *.spyjoin*\n` +
        `3️⃣ Host mulai (min 3 pemain): *.spy start*\n` +
        `4️⃣ Semua dapat lokasi via DM (spy dapat pesan berbeda)\n` +
        `5️⃣ Diskusi & vote spy: *.spy vote @user*\n` +
        `6️⃣ Reveal: *.spy selesai*\n\n` +
        `📊 Min 3 pemain, Max 4 pemain`)
  }
}

// ── HOST BUAT ROOM ────────────────────────────────────
async function spyHost({ sock, from, msg, reply, senderNumber, user }) {
  if (activeGames.has(from)) {
    const g = activeGames.get(from)
    return reply(`❌ Sudah ada game aktif di grup ini!\n👑 Host: ${g.hostName}\n👥 Pemain: ${g.players.length}/${g.maxPlayers}\n\nKetik *.spy status* untuk info lengkap.`)
  }

  const game = {
    host: senderNumber,
    hostName: user.name || senderNumber,
    players: [{ number: senderNumber, name: user.name || senderNumber, jid: senderNumber + '@s.whatsapp.net' }],
    maxPlayers: 4,
    minPlayers: 3,
    status: 'waiting', // waiting | playing | voting
    lokasi: null,
    spyIndex: null,
    votes: {},
    startTime: null,
    createdAt: Date.now()
  }

  activeGames.set(from, game)

  await sock.sendMessage(from, {
    text: `╔══════════════════════════╗\n║   🕵️ *SPY GAME ROOM*    ║\n╚══════════════════════════╝\n\n👑 Host: *${game.hostName}* sudah membuat room!\n\n👥 Pemain (1/${game.maxPlayers}):\n1. ✅ ${game.hostName} *(Host)*\n\n📢 Ketik *.spyjoin* untuk ikut!\nMin *3 pemain*, Max *4 pemain*.\n\nHost ketik *.spy start* kalau sudah siap.`
  }, { quoted: msg })
}

// ── JOIN ROOM ────────────────────────────────────────
async function spyJoin({ sock, from, msg, reply, senderNumber, user }) {
  if (!from.endsWith('@g.us')) return reply('❌ Hanya di grup!')

  if (!activeGames.has(from)) return reply('❌ Tidak ada room Spy aktif!\nKetik *.spy mulai* untuk buat room.')

  const game = activeGames.get(from)

  if (game.status !== 'waiting') return reply('❌ Game sudah berjalan!')
  if (game.players.some(p => p.number === senderNumber)) return reply('❌ Kamu sudah ada di room!')
  if (game.players.length >= game.maxPlayers) return reply(`❌ Room penuh! Max ${game.maxPlayers} pemain.`)

  const userData = await getUser(senderNumber)
  const nama = userData.name || senderNumber
  game.players.push({ number: senderNumber, name: nama, jid: senderNumber + '@s.whatsapp.net' })

  let daftarPemain = game.players.map((p, i) =>
    `${i+1}. ${p.name}${p.number === game.host ? ' 👑 *(Host)*' : ''}`
  ).join('\n')

  const sisaSlot = game.maxPlayers - game.players.length
  const bisaStart = game.players.length >= game.minPlayers

  await sock.sendMessage(from, {
    text: `✅ *${nama}* bergabung ke room Spy!\n\n👥 Pemain (${game.players.length}/${game.maxPlayers}):\n${daftarPemain}\n\n${bisaStart ? `✨ Sudah bisa mulai! Host ketik *.spy start*\n${sisaSlot > 0 ? `_(masih bisa tambah ${sisaSlot} pemain)_` : '_(Room penuh!)_'}` : `⏳ Masih butuh *${game.minPlayers - game.players.length} pemain* lagi.\nKetik *.spyjoin* untuk join!`}`
  }, { quoted: msg })
}

// ── START GAME ───────────────────────────────────────
async function spyStart({ sock, from, msg, reply, senderNumber }) {
  if (!activeGames.has(from)) return reply('❌ Tidak ada room Spy aktif!')

  const game = activeGames.get(from)

  if (game.host !== senderNumber) return reply('❌ Hanya host yang bisa mulai game!')
  if (game.status !== 'waiting')  return reply('❌ Game sudah berjalan!')
  if (game.players.length < game.minPlayers)
    return reply(`❌ Kurang pemain! Butuh min *${game.minPlayers}* pemain.\nSekarang: ${game.players.length} pemain.\n\nShare *.spyjoin* ke teman!`)

  // Tentukan spy secara acak
  game.lokasi    = randItem(LOKASI)
  game.spyIndex  = Math.floor(Math.random() * game.players.length)
  game.status    = 'playing'
  game.startTime = Date.now()
  game.votes     = {}

  // Kirim DM ke semua pemain
  let dmSuccess = 0, dmFail = 0
  for (let i = 0; i < game.players.length; i++) {
    const p = game.players[i]
    const isSpy = i === game.spyIndex
    try {
      await sock.sendMessage(p.jid, {
        text: isSpy
          ? `🕵️ *KAMu ADALAH SPY!*\n\n` +
            `Kamu tidak tahu lokasinya.\nCoba tebak dari petunjuk pemain lain!\n\nJangan ketahuan ya... 🤫\n\n` +
            `_Diskusi di grup sekarang dimulai!_`
          : `✅ *Kamu BUKAN Spy!*\n\n📍 Lokasi: *${game.lokasi}*\n\n` +
            `Ada 1 SPY di antara kalian yang tidak tahu lokasi ini.\nCari tahu siapa spy-nya!\n\n` +
            `_Diskusi di grup sekarang dimulai!_`
      })
      dmSuccess++
    } catch { dmFail++ }
    await new Promise(r => setTimeout(r, 300))
  }

  let daftarPemain = game.players.map((p, i) =>
    `${i+1}. ${p.name}${p.number === game.host ? ' 👑' : ''}`
  ).join('\n')

  await sock.sendMessage(from, {
    text: `╔══════════════════════════╗\n║   🕵️ *SPY GAME MULAI!*  ║\n╚══════════════════════════╝\n\n👥 Pemain (${game.players.length} orang):\n${daftarPemain}\n\n📩 Cek DM kalian masing-masing!\n${dmFail > 0 ? `⚠️ ${dmFail} DM gagal terkirim (privasi WA)\n` : ''}` +
      `\n🗣️ *Diskusi sekarang!*\nSemua pemain kasih petunjuk tanpa ketahuan.\n\nVote spy: *.spy vote @user*\nReveal: *.spy selesai*`
  }, { quoted: msg })
}

// ── VOTE ─────────────────────────────────────────────
async function spyVote({ sock, from, msg, reply, senderNumber, args }) {
  if (!activeGames.has(from)) return reply('❌ Tidak ada game Spy aktif!')

  const game = activeGames.get(from)
  if (game.status !== 'playing') return reply('❌ Game belum berjalan / sudah selesai!')
  if (!game.players.some(p => p.number === senderNumber)) return reply('❌ Kamu bukan pemain!')

  // Ambil target dari mention atau args
  const ctxMentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
  let targetNum = null
  if (ctxMentions.length) {
    targetNum = normalizeNumber(ctxMentions[0])
  } else if (args[1]) {
    targetNum = normalizeNumber(args[1])
  }

  if (!targetNum) return reply('❌ Format: *.spy vote @user*')
  if (targetNum === senderNumber) return reply('❌ Tidak bisa vote diri sendiri!')
  if (!game.players.some(p => p.number === targetNum)) return reply('❌ User itu bukan pemain!')

  game.votes[senderNumber] = targetNum
  const voterName  = game.players.find(p => p.number === senderNumber)?.name || senderNumber
  const targetName = game.players.find(p => p.number === targetNum)?.name || targetNum

  const totalVoters = game.players.length
  const sudahVote   = Object.keys(game.votes).length

  // Rekap vote
  const voteCount = {}
  Object.values(game.votes).forEach(v => { voteCount[v] = (voteCount[v] || 0) + 1 })
  let voteRecap = Object.entries(voteCount).map(([num, cnt]) => {
    const n = game.players.find(p => p.number === num)?.name || num
    return `• ${n}: ${'🟥'.repeat(cnt)}${'⬜'.repeat(totalVoters - cnt)} (${cnt} vote)`
  }).join('\n')

  await sock.sendMessage(from, {
    text: `🗳️ *${voterName}* vote → *${targetName}*\n\n` +
      `📊 Vote (${sudahVote}/${totalVoters}):\n${voteRecap}\n\n` +
      `${sudahVote >= totalVoters ? '✅ Semua sudah vote! Ketik *.spy selesai* untuk reveal.' : `⏳ Menunggu ${totalVoters - sudahVote} vote lagi...`}`
  }, { quoted: msg })
}

// ── SELESAI / REVEAL ──────────────────────────────────
async function spyEnd({ sock, from, msg, reply, senderNumber }) {
  if (!activeGames.has(from)) return reply('❌ Tidak ada game Spy aktif!')

  const game = activeGames.get(from)
  if (game.status === 'waiting') return reply('❌ Game belum dimulai!')
  if (game.host !== senderNumber && Object.keys(game.votes).length < game.players.length)
    return reply('❌ Hanya host yang bisa end game sebelum semua vote!')

  const spy     = game.players[game.spyIndex]
  const durasi  = Math.floor((Date.now() - game.startTime) / 1000)
  const mm      = Math.floor(durasi / 60), ss = durasi % 60

  // Hitung vote terbanyak
  const voteCount = {}
  Object.values(game.votes).forEach(v => { voteCount[v] = (voteCount[v] || 0) + 1 })
  let topVoted = null, maxVote = 0
  Object.entries(voteCount).forEach(([num, cnt]) => { if (cnt > maxVote) { maxVote = cnt; topVoted = num } })

  const correctGuess = topVoted === spy.number
  const voted = game.players.find(p => p.number === topVoted)

  let voteRecap = game.players.map(p => {
    const votedFor = game.votes[p.number]
    const votedName = game.players.find(x => x.number === votedFor)?.name || '(belum vote)'
    const isSpy = p.number === spy.number
    return `${isSpy ? '🕵️' : '✅'} *${p.name}* → vote: ${votedName}`
  }).join('\n')

  const resultText = correctGuess
    ? `🎉 *BENAR!* Kalian berhasil menemukan spy!\n🕵️ *${spy.name}* adalah SPY nya!`
    : `💀 *SALAH!* Spy berhasil kabur!\n🕵️ *${spy.name}* adalah SPY nya, tapi kalian vote *${voted?.name || '?'}*`

  activeGames.delete(from)

  // Beri reward
  if (correctGuess) {
    for (const p of game.players) {
      if (p.number !== spy.number) {
        const u = await getUser(p.number)
        await updateUser(p.number, { koin: u.koin + 200 })
      }
    }
  } else {
    const u = await getUser(spy.number)
    await updateUser(spy.number, { koin: u.koin + 300 })
  }

  await sock.sendMessage(from, {
    text: `╔══════════════════════════╗\n║   🕵️ *SPY GAME SELESAI* ║\n╚══════════════════════════╝\n\n📍 Lokasi: *${game.lokasi}*\n🕵️ Spy: *${spy.name}*\n\n${resultText}\n\n📊 *Recap Vote:*\n${voteRecap}\n\n⏱️ Durasi: ${mm}m ${ss}s\n\n${correctGuess ? '💰 +200 koin untuk semua pemain yang benar!' : `💰 +300 koin untuk spy (*${spy.name}*)!`}`
  }, { quoted: msg })
}

// ── STATUS ───────────────────────────────────────────
async function spyStatus({ reply, from }) {
  if (!activeGames.has(from)) return reply('❌ Tidak ada game Spy aktif di grup ini.')

  const game = activeGames.get(from)
  let daftar = game.players.map((p, i) =>
    `${i+1}. ${p.name}${p.number === game.host ? ' 👑' : ''}${game.votes[p.number] ? ' ✅' : game.status === 'playing' ? ' ⏳' : ''}`
  ).join('\n')

  const durasi = game.startTime ? Math.floor((Date.now() - game.startTime) / 1000) : 0
  const mm = Math.floor(durasi / 60), ss = durasi % 60

  await reply(`╔══════════════════════════╗\n║   🕵️ *SPY GAME STATUS*  ║\n╚══════════════════════════╝\n\n` +
    `📊 Status: *${game.status === 'waiting' ? '⏳ Menunggu pemain' : game.status === 'playing' ? '🎮 Sedang berlangsung' : '🗳️ Voting'}*\n` +
    `👑 Host: *${game.hostName}*\n` +
    `👥 Pemain (${game.players.length}/${game.maxPlayers}):\n${daftar}\n` +
    (game.status === 'playing' ? `\n🗳️ Vote: ${Object.keys(game.votes).length}/${game.players.length}\n⏱️ Durasi: ${mm}m ${ss}s\n` : '') +
    (game.status === 'waiting' ? `\n📢 Ketik *.spyjoin* untuk ikut!\n${game.players.length >= game.minPlayers ? 'Host bisa ketik *.spy start*' : `Butuh ${game.minPlayers - game.players.length} pemain lagi`}` : ''))
}

// ── CANCEL ───────────────────────────────────────────
async function spyCancel({ reply, from, senderNumber }) {
  if (!activeGames.has(from)) return reply('❌ Tidak ada game Spy aktif!')
  const game = activeGames.get(from)
  if (game.host !== senderNumber) return reply('❌ Hanya host yang bisa batalkan game!')
  activeGames.delete(from)
  await reply('❌ *Game Spy dibatalkan* oleh host.')
}

module.exports = { handleSpy, spyJoin, clue: async (ctx) => {
  if (!ctx.isGroup) return ctx.reply('❌ Hanya di grup!')
  if (!activeGames.has(ctx.from)) return ctx.reply('❌ Tidak ada game Spy aktif!')
  const game = activeGames.get(ctx.from)
  if (game.status !== 'playing') return ctx.reply('❌ Game belum berjalan!')
  if (!game.players.some(p => p.number === ctx.senderNumber)) return ctx.reply('❌ Kamu bukan pemain!')
  if (!ctx.text) return ctx.reply('❌ Format: .clue [petunjukmu]')
  const sender = game.players.find(p => p.number === ctx.senderNumber)
  await ctx.sock.sendMessage(ctx.from, {
    text: `💬 *CLUE dari ${sender?.name || ctx.senderNumber}:*\n"${ctx.text}"\n\n_Vote spy: .spy vote @user_`
  }, { quoted: ctx.msg })
} }
