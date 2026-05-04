require('dotenv').config()
const { getUser, updateUser, normalizeNumber, SUPEROWNER } = require('../database/db')
const { getMessageBody } = require('../utils/helper')
const fs   = require('fs-extra')
const path = require('path')

const ekonomi = require('../commands/ekonomi')
const game    = require('../commands/game')
const spy     = require('../commands/spy')
const info    = require('../commands/info')
const media   = require('../commands/media')
const ai      = require('../commands/ai')
const owner   = require('../commands/owner')
const admin   = require('../commands/admin')
const stiker  = require('../commands/stiker')
const bank    = require('../commands/bank')

const PREFIX = '.'
const BOT_PIC = path.join(__dirname, '../../assets/botpic.png')

// Helper kirim gambar + caption
async function sendWithPhoto(sock, from, msg, caption) {
  try {
    if (await fs.pathExists(BOT_PIC)) {
      const img = await fs.readFile(BOT_PIC)
      await sock.sendMessage(from, { image: img, caption }, { quoted: msg })
    } else {
      await sock.sendMessage(from, { text: caption }, { quoted: msg })
    }
  } catch {
    await sock.sendMessage(from, { text: caption }, { quoted: msg })
  }
}

async function messageHandler(sock, msg) {
  const from         = msg.key.remoteJid
  const isGroup      = from.endsWith('@g.us')
  const sender       = isGroup ? msg.key.participant : msg.key.remoteJid
  const senderNumber = normalizeNumber(sender)

  const body = getMessageBody(msg)
  if (!body) return

  // ── Ambil data user ─────────────────────────────────
  const user         = await getUser(senderNumber)
  const isSuperOwner = senderNumber === SUPEROWNER
  const isOwner      = isSuperOwner || user.role === 'owner'

  // Maintenance check
  if (owner.isMaintenanceMode() && !isOwner)
    return sock.sendMessage(from, { text: '🔧 Bot sedang maintenance. Coba lagi nanti!' }, { quoted: msg })

  // Banned check
  if (user.banned && !isOwner)
    return sock.sendMessage(from, { text: '❌ Kamu dibanned dari bot ini.' }, { quoted: msg })

  // Update nama
  if (msg.pushName && user.name !== msg.pushName)
    await updateUser(senderNumber, { name: msg.pushName })

  // ── Cek sudah daftar ─────────────────────────────────
  if (!user.registered && !isOwner) {
    const allowedBeforeRegister = ['daftar','register','menu','help','start','ping','info','owner']
    if (body.startsWith(PREFIX)) {
      const cmdCheck = body.slice(PREFIX.length).trim().split(/\s+/)[0].toLowerCase()
      if (!allowedBeforeRegister.includes(cmdCheck)) {
        return sock.sendMessage(from, {
          text: `❌ Kamu belum terdaftar!\n\nKetik *.daftar [nama]* untuk mendaftar dan dapat *50.000 koin* gratis! 🎁\n\nContoh: *.daftar Budi*`
        }, { quoted: msg })
      }
    } else {
      const botNum = normalizeNumber(sock.user.id)
      const contextInfo2 = msg.message?.extendedTextMessage?.contextInfo || null
      const mentioned2 = contextInfo2?.mentionedJid || []
      const isMentioned2 = mentioned2.some(j => normalizeNumber(j) === botNum)
      const replyPart2 = contextInfo2?.participant || ''
      const isReply2 = normalizeNumber(replyPart2) === botNum
      if (isMentioned2 || isReply2 || !isGroup) {
        return sock.sendMessage(from, {
          text: `❌ Kamu belum terdaftar!\n\nKetik *.daftar [nama]* untuk mendaftar! 🎁`
        }, { quoted: msg })
      }
      return
    }
  }

  // ── Cek admin grup ───────────────────────────────────
  let isGroupAdmin = false
  if (isGroup) {
    try {
      const meta   = await sock.groupMetadata(from)
      const admins = meta.participants.filter(p => p.admin).map(p => normalizeNumber(p.id))
      isGroupAdmin = admins.includes(senderNumber) || isOwner
    } catch {}
  }

  // ── AI via mention / reply / DM ──────────────────────
  if (!body.startsWith(PREFIX)) {
    if (!isGroup) return ai.chat(sock, msg, body, from, sender)
    const botNum = normalizeNumber(sock.user.id)
    const contextInfo = (
      msg.message?.extendedTextMessage?.contextInfo ||
      msg.message?.imageMessage?.contextInfo ||
      msg.message?.videoMessage?.contextInfo ||
      msg.message?.stickerMessage?.contextInfo ||
      msg.message?.documentMessage?.contextInfo ||
      null
    )
    const mentioned = contextInfo?.mentionedJid || []
    const isMentioned = mentioned.some(j => normalizeNumber(j) === botNum)
    const replyParticipant = contextInfo?.participant || ''
    const quotedRemote     = contextInfo?.remoteJid  || ''
    const isReply = normalizeNumber(replyParticipant) === botNum || normalizeNumber(quotedRemote) === botNum
    if (isMentioned || isReply) {
      const cleanBody = body.replace(/@\d+/g, '').trim()
      if (cleanBody) return ai.chat(sock, msg, cleanBody, from, sender)
    }
    return
  }

  const args    = body.slice(PREFIX.length).trim().split(/\s+/)
  const command = args.shift().toLowerCase()
  const text    = args.join(' ')

  const mentionedJids = (
    msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ||
    msg.message?.imageMessage?.contextInfo?.mentionedJid ||
    []
  )

  const ctx = {
    sock, msg, from, sender, senderNumber,
    isGroup, isOwner, isSuperOwner, isGroupAdmin,
    args, text, command, mentionedJids, user,
    reply: (t) => sock.sendMessage(from, { text: String(t) }, { quoted: msg }),
  }

  // Log command
  if (global.botLog) {
    const role = isSuperOwner ? ' 👑' : isOwner ? ' 🔑' : isGroupAdmin ? ' 🛡️' : ''
    global.botLog.cmd(`.${command} ← ${senderNumber}${role}`)
  }

  try {
    switch (command) {

      // ── EKONOMI ────────────────────────────────────
      case 'saldo': case 'balance':        return ekonomi.saldo(ctx)
      case 'daily':                         return ekonomi.daily(ctx)
      case 'tambang': case 'mining':        return ekonomi.tambang(ctx)
      case 'ternak':                        return ekonomi.ternak(ctx)
      case 'beli': case 'buy':
        if (['gold','diamond'].includes((ctx.args[0]||'').toLowerCase()))
          return bank.beliAset(ctx)
        return ekonomi.beli(ctx)
      case 'jual': case 'sell':
        if (['gold','diamond'].includes((ctx.args[0]||'').toLowerCase()))
          return bank.jualAset(ctx)
        return ekonomi.jual(ctx)
      case 'transfer': case 'tf':           return ekonomi.transfer(ctx)
      case 'curi': case 'steal':            return ekonomi.curi(ctx)
      case 'leaderboard': case 'lb':        return ekonomi.leaderboard(ctx)
      case 'profil': case 'profile':        return ekonomi.profil(ctx)
      case 'inventory': case 'inv':         return ekonomi.inventory(ctx)
      case 'toko': case 'shop':             return ekonomi.toko(ctx)

      // ── GAME ───────────────────────────────────────
      case 'trivia':                        return game.trivia(ctx)
      case 'tebak':                         return game.tebakKata(ctx)
      case 'tts':                           return game.tebakTebakan(ctx)
      case 'rps':                           return game.rps(ctx)
      case 'jawab':                         return game.jawab(ctx)
      case 'gacha':                         return game.gacha(ctx)
      case 'slot':                          return game.slot(ctx)
      case 'tebakangka': case 'ta':         return game.tebakAngka(ctx)
      case 'nebak':                         return game.nebak(ctx)
      case 'hangman': case 'gantung':       return game.hangman(ctx)
      case 'huruf':                         return game.huruf(ctx)
      case 'matematik': case 'math':        return game.matematik(ctx)
      case 'suit':                          return game.suit(ctx)
      case 'spin': case 'roda':             return game.spin(ctx)

      // ── JUDI ───────────────────────────────────────
      case 'dadu':                          return game.dadu(ctx)
      case 'bj': case 'blackjack':          return game.blackjack(ctx)
      case 'hit':                           return game.bjHit(ctx)
      case 'stand':                         return game.bjStand(ctx)
      case 'rolet': case 'roulette':        return game.rolet(ctx)
      case 'flip': case 'coinflip':         return game.coinflip(ctx)
      case 'kuda': case 'balapan':          return game.kuda(ctx)

      // ── SPY ────────────────────────────────────────
      case 'spy':                           return spy.handleSpy(ctx)
      case 'spyjoin':                       return spy.spyJoin(ctx)
      case 'clue':                          return spy.clue(ctx)

      // ── INFO ───────────────────────────────────────
      case 'cuaca': case 'weather':         return info.cuaca(ctx)
      case 'gempa': case 'bmkg':            return info.gempa(ctx)
      case 'berita': case 'news':           return info.berita(ctx)
      case 'sholat': case 'solat':          return info.sholat(ctx)
      case 'kurs':                          return info.kurs(ctx)
      case 'arti': case 'dict':             return info.arti(ctx)
      case 'translate': case 'tr':          return info.translate(ctx)
      case 'ocr':                           return info.ocr(ctx)
      case 'ip': case 'cekip':              return info.cekip(ctx)
      case 'lirik': case 'lyric':           return info.lirik(ctx)
      case 'jadwal':                        return info.jadwal(ctx)
      case 'tambahjadwal':                  return info.tambahJadwal(ctx)
      case 'hapusjadwal':                   return info.hapusJadwal(ctx)
      case 'kalkulator': case 'calc':       return info.kalkulator(ctx)
      case 'qr':                            return info.buatQR(ctx)

      // ── BANK & INVESTASI ───────────────────────────
      case 'bank':                          return bank.infoBank(ctx)
      case 'portfolio': case 'porto':       return bank.portfolio(ctx)

      // ── MEDIA ──────────────────────────────────────
      case 'yt': case 'ytmp3':              return media.ytmp3(ctx)
      case 'ytmp4':                         return media.ytmp4(ctx)
      case 'tiktok': case 'tt':             return media.tiktok(ctx)
      case 'imagine': case 'generate':      return media.imagine(ctx)

      // ── STIKER ─────────────────────────────────────
      case 's': case 'stiker': case 'sticker': return stiker.buatStiker(ctx)
      case 'st': case 'stikerteks':             return stiker.stikerTeks(ctx)
      case 'toimg': case 'toimage':             return stiker.stikerKeGambar(ctx)

      // ── AI ─────────────────────────────────────────
      case 'tanya': case 'ai':              return ai.tanya(ctx)
      case 'resetai':                       return ai.resetHistory(ctx)

      // ── ADMIN GRUP ─────────────────────────────────
      case 'kick':                          return admin.kick(ctx)
      case 'promote':                       return admin.promote(ctx)
      case 'demote':                        return admin.demote(ctx)
      case 'lock':                          return admin.lockGrup(ctx)
      case 'unlock':                        return admin.unlockGrup(ctx)
      case 'tagall':                        return admin.tagall(ctx)
      case 'hidetag':                       return admin.hidetag(ctx)
      case 'warn':                          return admin.warn(ctx)
      case 'resetwarn':                     return admin.resetWarn(ctx)
      case 'listwarn':                      return admin.listWarn(ctx)
      case 'setwelcome':                    return admin.setWelcome(ctx)
      case 'setbye':                        return admin.setGoodbye(ctx)
      case 'antilink':                      return admin.antilink(ctx)
      case 'groupinfo': case 'ginfo':       return admin.groupInfo(ctx)
      case 'listmember': case 'members':    return admin.listMember(ctx)

      // ── OWNER ──────────────────────────────────────
      case 'ban':
        if (!isOwner) return ctx.reply('❌ Command khusus owner!')
        return owner.ban(ctx)
      case 'unban':
        if (!isOwner) return ctx.reply('❌ Command khusus owner!')
        return owner.unban(ctx)
      case 'addkoin':
        if (!isOwner) return ctx.reply('❌ Command khusus owner!')
        return owner.addKoin(ctx)
      case 'setkoin':
        if (!isOwner) return ctx.reply('❌ Command khusus owner!')
        return owner.setKoin(ctx)
      case 'resetkoin':
        if (!isOwner) return ctx.reply('❌ Command khusus owner!')
        return owner.resetKoin(ctx)
      case 'listuser':
        if (!isOwner) return ctx.reply('❌ Command khusus owner!')
        return owner.listUser(ctx)
      case 'deluser':
        if (!isOwner) return ctx.reply('❌ Command khusus owner!')
        return owner.delUser(ctx)
      case 'setowner':
        if (!isSuperOwner) return ctx.reply('❌ Hanya superowner yang bisa set owner!')
        return owner.setOwner(ctx)
      case 'unsetowner':
        if (!isSuperOwner) return ctx.reply('❌ Hanya superowner yang bisa cabut owner!')
        return owner.unsetOwner(ctx)
      case 'join':
        if (!isOwner) return ctx.reply('❌ Command khusus owner!')
        return owner.joinGrup(ctx)
      case 'leave':
        if (!isOwner) return ctx.reply('❌ Command khusus owner!')
        return owner.leaveGrup(ctx)
      case 'maintenance':
        if (!isOwner) return ctx.reply('❌ Command khusus owner!')
        return owner.maintenance(ctx)
      case 'bypass':
        if (!isOwner) return ctx.reply('❌ Command khusus owner!')
        return owner.bypass(ctx)
      case 'restart':
        if (!isOwner) return ctx.reply('❌ Command khusus owner!')
        return owner.restart(ctx)

      // ── UMUM ───────────────────────────────────────
      case 'daftar': case 'register':          return daftar(ctx)
      case 'menu': case 'help': case 'start':  return sendMenu(ctx)
      case 'ping': return ctx.reply(`🏓 *Pong!*\n⚡ Bot aktif!\n⏱️ Latensi: ${Date.now() - msg.messageTimestamp * 1000}ms`)
      case 'info':  return sendInfo(ctx)
      case 'owner': return ctx.reply(`👑 *Superowner Maiilouve Bot*\nwa.me/${SUPEROWNER}`)

      default: // diam kalau tidak dikenal
    }
  } catch (err) {
    if (global.botLog) global.botLog.error(`Error .${command}: ${err.message}`)
    ctx.reply(`❌ Terjadi error: ${err.message}`)
  }
}

// ─────────────────────────────────────────────────────
//   DAFTAR — kirim foto bot
// ─────────────────────────────────────────────────────
async function daftar({ reply, sock, from, msg, senderNumber, user, text, isSuperOwner }) {
  const BONUS = 50000
  if (isSuperOwner && user.registered) return reply('👑 Kamu adalah Superowner, sudah terdaftar otomatis!')
  if (user.registered)
    return reply(`❌ Kamu sudah terdaftar sebagai *${user.name}*!\n\n💰 Saldo: *${user.koin.toLocaleString('id-ID')} koin*\n\nKetik *.menu* untuk melihat semua fitur.`)
  const nama = text.trim()
  if (!nama) return reply('❌ Format: *.daftar [nama]*\nContoh: *.daftar Budi*')
  if (nama.length < 2) return reply('❌ Nama terlalu pendek! Minimal 2 karakter.')
  if (nama.length > 20) return reply('❌ Nama terlalu panjang! Maksimal 20 karakter.')

  await updateUser(senderNumber, { name: nama, koin: BONUS, registered: true })

  const caption = `╔══════════════════════════════╗\n║   🌸 *SELAMAT DATANG!* 🌸    ║\n╚══════════════════════════════╝\n\n✅ Pendaftaran berhasil!\n\n🎁 Selamat *${nama}* menerima hadiah dari *Maiilouve* sebesar *50.000 koin* gratis!\n\n💰 Saldo awal: *50.000 koin*\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━\nKetik *.menu* untuk lihat semua fitur\nKetik *.daily* untuk klaim koin harian 🌸`
  await sendWithPhoto(sock, from, msg, caption)
}

// ─────────────────────────────────────────────────────
//   MENU — kirim foto bot
// ─────────────────────────────────────────────────────
async function sendMenu({ sock, msg, from, isOwner, isSuperOwner, isGroupAdmin, isGroup, user }) {
  const badge = isSuperOwner ? '👑 Superowner' : user.role === 'owner' ? '🔑 Owner' : isGroupAdmin ? '🛡️ Admin' : '👤 Member'
  const menuText = `╔══════════════════════════════╗
║   🌸  *MAIILOUVE BOT v4*  🌸 ║
╚══════════════════════════════╝

${badge} — *${user.name || 'Kawan'}*
💰 *${user.koin.toLocaleString('id-ID')} koin*  |  ⭐ Lv.${user.level}

━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 *EKONOMI*
━━━━━━━━━━━━━━━━━━━━━━━━━━
• .saldo [@user]       — Cek saldo
• .daily               — Koin harian
• .tambang             — Gali koin (cd 3 mnt)
• .ternak              — Collect hasil ternak
• .toko                — Lihat toko
• .beli [item]         — Beli item
• .jual [item]         — Jual item
• .transfer @u jumlah  — Kirim koin
• .curi @user          — Curi koin
• .leaderboard         — Top 10 koin
• .profil [@user]      — Lihat profil
• .inventory           — Lihat inventory

━━━━━━━━━━━━━━━━━━━━━━━━━━
🏦 *BANK & INVESTASI*
━━━━━━━━━━━━━━━━━━━━━━━━━━
• .bank                — Info harga & saldo bank
• .portfolio           — Lihat investasimu
• .beli gold [jml]     — Beli gold 🟡
• .beli diamond [jml]  — Beli diamond 💎
• .jual gold [jml]     — Jual gold
• .jual diamond [jml]  — Jual diamond

━━━━━━━━━━━━━━━━━━━━━━━━━━
🎮 *GAME*
━━━━━━━━━━━━━━━━━━━━━━━━━━
• .trivia              — Soal trivia (+150 koin)
• .tebak               — Tebak kata (+100 koin)
• .tts                 — Tebak-tebakan (+75 koin)
• .matematik           — Matematika cepat (+50 koin)
• .jawab [jawaban]     — Jawab soal aktif
• .tebakangka          — Tebak angka bot (1-100)
• .nebak [angka]       — Jawab tebak angka
• .hangman             — Game tebak kata huruf (+200 koin)
• .huruf [huruf]       — Tebak huruf di hangman
• .rps [batu/gunting/kertas]
• .suit [api/air/angin]
• .gacha               — Gacha item (100 koin)
• .slot                — Slot machine (50 koin)
• .spin                — Putar roda keberuntungan (75 koin)

━━━━━━━━━━━━━━━━━━━━━━━━━━
🎲 *JUDI / BET*
━━━━━━━━━━━━━━━━━━━━━━━━━━
• .dadu [bet] [pilihan]   — Dadu (ganjil/genap/besar/kecil/1-6)
• .bj [bet]               — Blackjack / 21
• .hit                    — Ambil kartu (blackjack)
• .stand                  — Berhenti (blackjack)
• .rolet [bet] [pilihan]  — Roulette (merah/hitam/0-36)
• .flip [bet] [heads/tails]— Lempar koin x2
• .kuda [bet] [1-4]       — Balapan kuda x3

━━━━━━━━━━━━━━━━━━━━━━━━━━
🕵️ *GAME SPY*
━━━━━━━━━━━━━━━━━━━━━━━━━━
• .spy mulai           — Host buat room
• .spyjoin             — Join room spy
• .spy start           — Host mulai (min 3 org)
• .clue [teks]         — Kirim clue ke grup
• .spy vote @user      — Vote siapa spy
• .spy selesai         — Reveal & akhiri
• .spy status          — Lihat status game
• .spy batal           — Host batalkan game

━━━━━━━━━━━━━━━━━━━━━━━━━━
📰 *INFO & UTILITAS*
━━━━━━━━━━━━━━━━━━━━━━━━━━
• .cuaca [kota]        — Info cuaca
• .gempa               — Gempa BMKG terbaru
• .berita [keyword]    — Berita terkini
• .sholat [kota]       — Jadwal sholat
• .kurs                — Kurs mata uang
• .arti [kata]         — Arti kata (EN)
• .translate [teks]    — Terjemahkan
• .ocr                 — Baca teks dari foto
• .ip                  — Cek info IP
• .lirik [judul-artis] — Lirik lagu
• .jadwal              — Jadwal grup
• .tambahjadwal        — Tambah jadwal
• .calc [ekspresi]     — Kalkulator
• .qr [teks]           — Buat QR code

━━━━━━━━━━━━━━━━━━━━━━━━━━
📥 *DOWNLOAD*
━━━━━━━━━━━━━━━━━━━━━━━━━━
• .yt [link]           — YouTube → MP3
• .ytmp4 [link]        — YouTube → MP4
• .tt [link]           — TikTok (no watermark)

━━━━━━━━━━━━━━━━━━━━━━━━━━
🖼️ *STIKER*
━━━━━━━━━━━━━━━━━━━━━━━━━━
• .s / .stiker         — Foto/Video → Stiker
• .st [teks]           — Teks → Stiker
• .toimg               — Stiker → Foto
• .imagine [prompt]    — AI generate gambar

━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 *AI CHAT*
━━━━━━━━━━━━━━━━━━━━━━━━━━
• .tanya [pertanyaan]  — Tanya AI
• .resetai             — Reset history AI
• Mention/reply bot    — Chat AI di grup
• DM bot               — Chat AI langsung
${isGroup && isGroupAdmin ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━
🛡️ *ADMIN GRUP*
━━━━━━━━━━━━━━━━━━━━━━━━━━
• .kick @user          — Kick member
• .promote @user       — Jadikan admin
• .demote @user        — Cabut admin
• .lock                — Lock grup
• .unlock              — Unlock grup
• .tagall [pesan]      — Mention semua member
• .hidetag [pesan]     — Mention semua (hidden)
• .warn @user [alasan] — Beri peringatan (3x→kick)
• .resetwarn @user     — Reset peringatan
• .listwarn            — Daftar peringatan
• .listmember          — Daftar member lengkap
• .setwelcome [teks]   — Custom pesan welcome
• .setbye [teks]       — Custom pesan goodbye
• .antilink on/off     — Toggle anti-link
• .groupinfo           — Info lengkap grup` : ''}
${isOwner ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━
${isSuperOwner ? '👑 *SUPEROWNER*' : '🔑 *OWNER*'}
━━━━━━━━━━━━━━━━━━━━━━━━━━
• .ban @user           — Ban user
• .unban @user         — Unban user
• .deluser @user       — Hapus data user
• .addkoin @u [jml]    — Tambah koin
• .setkoin @u [jml]    — Set koin
• .resetkoin @u        — Reset koin ke 0
• .listuser            — Daftar semua user
• .join [link]         — Bot join grup
• .leave               — Bot leave grup ini
• .bypass @u on/off    — Bypass cooldown
• .maintenance on/off  — Mode maintenance
• .restart             — Restart bot (PM2/nodemon)${isSuperOwner ? `
• .setowner @user      — Jadikan owner
• .unsetowner @user    — Cabut owner` : ''}` : ''}

_🌸 Maiilouve Bot v4 — Selalu siap melayani!_`

  await sendWithPhoto(sock, from, msg, menuText)
}

async function sendInfo({ reply }) {
  await reply(`╔══════════════════════════════╗
║   🌸  *MAIILOUVE BOT v4*  🌸 ║
╚══════════════════════════════╝

🤖 Nama    : Maiilouve v4
📚 Library : @whiskeysockets/baileys
⚡ Runtime : Node.js
💾 DB      : JSON (file-based)
🤖 AI      : Groq (llama-3.3-70b)
👑 Owner   : wa.me/${SUPEROWNER}
🎮 Games   : 13 jenis game

_Ketik .menu untuk daftar command_ 🌸`)
}

module.exports = messageHandler
