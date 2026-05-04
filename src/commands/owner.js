require('dotenv').config()
const { getUser, updateUser, getAllUsers, deleteUser, clearAllCooldowns, normalizeNumber, SUPEROWNER } = require('../database/db')

let maintenanceMode = false
const bypassList    = new Set()

// ── BAN / UNBAN ───────────────────────────────────────
async function ban({ reply, msg, sock, from, mentionedJids, senderNumber, isSuperOwner }) {
  if (!mentionedJids.length) return reply('❌ Format: .ban @user')
  const num = normalizeNumber(mentionedJids[0])
  if (num === SUPEROWNER) return reply('❌ Tidak bisa ban superowner!')
  const target = await getUser(num)
  if (target.role === 'owner' && !isSuperOwner) return reply('❌ Tidak bisa ban owner lain!')
  await updateUser(num, { banned: true })
  await sock.sendMessage(from, { text: `🚫 *${target.name || num}* dibanned dari bot!`, mentions: [mentionedJids[0]] }, { quoted: msg })
}

async function unban({ reply, msg, sock, from, mentionedJids }) {
  if (!mentionedJids.length) return reply('❌ Format: .unban @user')
  const num = normalizeNumber(mentionedJids[0])
  const target = await getUser(num)
  await updateUser(num, { banned: false })
  await sock.sendMessage(from, { text: `✅ *${target.name || num}* di-unban!`, mentions: [mentionedJids[0]] }, { quoted: msg })
}

// ── KOIN ──────────────────────────────────────────────
async function addKoin({ reply, mentionedJids, args }) {
  if (!mentionedJids.length) return reply('❌ Format: .addkoin @user jumlah')
  const num = normalizeNumber(mentionedJids[0])
  const jml = parseInt(args.find(a => /^\d+$/.test(a)))
  if (!jml) return reply('❌ Masukkan jumlah!')
  const u = await getUser(num)
  await updateUser(num, { koin: u.koin + jml })
  await reply(`✅ +${jml.toLocaleString('id-ID')} koin → *${u.name || num}*\nTotal: *${(u.koin + jml).toLocaleString('id-ID')} koin*`)
}

async function setKoin({ reply, mentionedJids, args }) {
  if (!mentionedJids.length) return reply('❌ Format: .setkoin @user jumlah')
  const num = normalizeNumber(mentionedJids[0])
  const jml = parseInt(args.find(a => /^\d+$/.test(a)))
  if (isNaN(jml)) return reply('❌ Masukkan jumlah!')
  const u = await getUser(num)
  await updateUser(num, { koin: jml })
  await reply(`✅ Koin *${u.name || num}* diset ke *${jml.toLocaleString('id-ID')} koin*`)
}

async function resetKoin({ reply, mentionedJids }) {
  if (!mentionedJids.length) return reply('❌ Format: .resetkoin @user')
  const num = normalizeNumber(mentionedJids[0])
  const u = await getUser(num)
  await updateUser(num, { koin: 0 })
  await reply(`✅ Koin *${u.name || num}* direset ke 0.`)
}

// ── LIST USER ─────────────────────────────────────────
async function listUser({ reply }) {
  const all   = await getAllUsers()
  const users = Object.values(all).filter(u => u.number !== '__market')
  if (!users.length) return reply('❌ Belum ada user terdaftar.')
  users.sort((a, b) => b.koin - a.koin)
  let txt = `╔══════════════════════════╗\n║    👥 *DAFTAR USER*      ║\n╚══════════════════════════╝\n\nTotal: *${users.length} user*\n\n`
  users.slice(0, 30).forEach((u, i) => {
    const role = u.role === 'superowner' ? '👑' : u.role === 'owner' ? '🔑' : '👤'
    const reg  = u.registered ? '' : ' _(belum daftar)_'
    txt += `${i+1}. ${role} *${u.name || '(no name)'}* — ${u.koin.toLocaleString('id-ID')} koin${u.banned ? ' 🚫' : ''}${reg}\n`
  })
  if (users.length > 30) txt += `\n_...dan ${users.length - 30} lainnya_`
  await reply(txt)
}

// ── DEL USER ─────────────────────────────────────────
async function delUser({ reply, mentionedJids, isSuperOwner }) {
  if (!mentionedJids.length) return reply('❌ Format: .deluser @user')
  const num = normalizeNumber(mentionedJids[0])
  if (num === SUPEROWNER) return reply('❌ Tidak bisa hapus superowner!')
  const target = await getUser(num)
  if (target.role === 'owner' && !isSuperOwner) return reply('❌ Tidak bisa hapus data owner!')
  const ok = await deleteUser(num)
  if (!ok) return reply('❌ Gagal hapus user!')
  await reply(`🗑️ Data *${target.name || num}* berhasil dihapus dari database.`)
}

// ── SET OWNER / UNSET OWNER ───────────────────────────
async function setOwner({ reply, msg, sock, from, mentionedJids }) {
  if (!mentionedJids.length) return reply('❌ Format: .setowner @user')
  const num = normalizeNumber(mentionedJids[0])
  if (num === SUPEROWNER) return reply('ℹ️ User ini sudah superowner!')
  const target = await getUser(num)
  if (!target.registered) return reply('❌ User belum terdaftar di bot!')
  await updateUser(num, { role: 'owner' })
  await sock.sendMessage(from, {
    text: `👑 *${target.name || num}* sekarang menjadi *Owner*!\n\nHanya Mayyy yang bisa mencabut status owner ini.`,
    mentions: [mentionedJids[0]]
  }, { quoted: msg })
}

async function unsetOwner({ reply, msg, sock, from, mentionedJids }) {
  if (!mentionedJids.length) return reply('❌ Format: .unsetowner @user')
  const num = normalizeNumber(mentionedJids[0])
  if (num === SUPEROWNER) return reply('❌ Tidak bisa cabut status superowner!')
  const target = await getUser(num)
  if (target.role !== 'owner') return reply('❌ User ini bukan owner.')
  await updateUser(num, { role: 'member' })
  await sock.sendMessage(from, {
    text: `🔓 Status owner *${target.name || num}* dicabut oleh Superowner.`,
    mentions: [mentionedJids[0]]
  }, { quoted: msg })
}

// ── JOIN / LEAVE GRUP ─────────────────────────────────
async function joinGrup({ reply, text, sock }) {
  if (!text) return reply('❌ Format: .join [link grup]')
  if (!text.includes('chat.whatsapp.com')) return reply('❌ Link grup tidak valid! Format: https://chat.whatsapp.com/...')
  const code = text.split('chat.whatsapp.com/')[1]?.split(/\s/)[0]
  if (!code) return reply('❌ Kode link tidak ditemukan!')
  try {
    await sock.groupAcceptInvite(code)
    await reply('✅ Bot berhasil join grup!')
  } catch (e) {
    await reply(`❌ Gagal join grup: ${e.message}`)
  }
}

async function leaveGrup({ reply, sock, from }) {
  try {
    await reply('👋 Bot akan leave dari grup ini...')
    await new Promise(r => setTimeout(r, 1500))
    await sock.groupLeave(from)
  } catch (e) {
    await reply(`❌ Gagal leave grup: ${e.message}`)
  }
}

// ── MAINTENANCE ───────────────────────────────────────
async function maintenance({ reply, text }) {
  const val = (text || '').toLowerCase()
  if (!['on', 'off'].includes(val)) return reply('❌ Format: .maintenance on/off')
  maintenanceMode = val === 'on'
  await reply(maintenanceMode ? '🔧 Mode *maintenance* aktif! Bot tidak merespons user biasa.' : '✅ Mode maintenance *nonaktif*. Bot kembali normal.')
}

// ── BYPASS COOLDOWN ───────────────────────────────────
async function bypass({ reply, msg, sock, from, mentionedJids, text, senderNumber }) {
  const val = (text || '').split(/\s+/).pop().toLowerCase()
  let targetNum = senderNumber
  if (mentionedJids.length) targetNum = normalizeNumber(mentionedJids[0])
  if (!['on', 'off'].includes(val)) return reply('❌ Format: .bypass [@user] on/off')
  if (val === 'on') {
    bypassList.add(targetNum)
    await clearAllCooldowns(targetNum)
    await sock.sendMessage(from, {
      text: `⚡ Bypass cooldown *aktif* untuk *${targetNum}*!\nSemua cooldown dihapus.`,
      mentions: mentionedJids.length ? [mentionedJids[0]] : []
    }, { quoted: msg })
  } else {
    bypassList.delete(targetNum)
    await reply(`✅ Bypass cooldown *nonaktif* untuk *${targetNum}*.`)
  }
}

function isBypassed(number)  { return bypassList.has(normalizeNumber(number)) }
function isMaintenanceMode() { return maintenanceMode }

module.exports = {
  ban, unban,
  addKoin, setKoin, resetKoin,
  listUser, delUser,
  setOwner, unsetOwner,
  joinGrup, leaveGrup,
  maintenance, bypass, restart,
  isBypassed, isMaintenanceMode
}

// ── RESTART BOT ───────────────────────────────────────
async function restart({ reply, sock }) {
  await reply('♻️ *Bot akan di-restart sekarang...*\n\n_Tunggu beberapa detik, bot akan kembali online_ 🌸')
  await new Promise(r => setTimeout(r, 2000))
  if (global.botLog) global.botLog.warn('Restart diminta oleh owner.')
  process.exit(0) // PM2 / nodemon akan auto-restart
}

