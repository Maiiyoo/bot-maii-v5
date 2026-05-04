const { getGroup, updateGroup, normalizeNumber, SUPEROWNER } = require('../database/db')

// ── Helper: cek bot adalah admin ─────────────────────
async function botIsAdmin(sock, from) {
  try {
    const meta    = await sock.groupMetadata(from)
    const botNum  = normalizeNumber(sock.user.id)
    const botPart = meta.participants.find(p => normalizeNumber(p.id) === botNum)
    return botPart?.admin ? true : false
  } catch { return false }
}

// ── Helper: cek target adalah superowner ─────────────
function isProtected(targetNum) {
  return normalizeNumber(targetNum) === SUPEROWNER
}

// ── KICK ─────────────────────────────────────────────
async function kick({ sock, from, msg, reply, isGroup, isGroupAdmin, mentionedJids, senderNumber }) {
  if (!isGroup)      return reply('❌ Hanya di grup!')
  if (!isGroupAdmin) return reply('❌ Kamu bukan admin!')
  if (!mentionedJids.length) return reply('❌ Format: .kick @user')

  if (!await botIsAdmin(sock, from)) return reply('❌ Bot bukan admin grup!')

  const results = []
  for (const jid of mentionedJids) {
    const num = normalizeNumber(jid)
    if (num === senderNumber) { results.push(`❌ ${num}: Tidak bisa kick diri sendiri`); continue }
    if (isProtected(num))     { results.push(`❌ ${num}: User ini dilindungi`); continue }
    try {
      await sock.groupParticipantsUpdate(from, [jid], 'remove')
      results.push(`✅ @${num} berhasil dikick`)
    } catch { results.push(`❌ @${num}: Gagal kick`) }
  }

  await sock.sendMessage(from, {
    text: `🦶 *KICK*\n\n${results.join('\n')}`,
    mentions: mentionedJids
  }, { quoted: msg })
}

// ── PROMOTE ──────────────────────────────────────────
async function promote({ sock, from, msg, reply, isGroup, isGroupAdmin, mentionedJids, senderNumber }) {
  if (!isGroup)      return reply('❌ Hanya di grup!')
  if (!isGroupAdmin) return reply('❌ Kamu bukan admin!')
  if (!mentionedJids.length) return reply('❌ Format: .promote @user')
  if (!await botIsAdmin(sock, from)) return reply('❌ Bot bukan admin grup!')

  const results = []
  for (const jid of mentionedJids) {
    try {
      await sock.groupParticipantsUpdate(from, [jid], 'promote')
      results.push(`✅ @${normalizeNumber(jid)} dijadikan admin`)
    } catch { results.push(`❌ @${normalizeNumber(jid)}: Gagal`) }
  }

  await sock.sendMessage(from, {
    text: `⬆️ *PROMOTE*\n\n${results.join('\n')}`,
    mentions: mentionedJids
  }, { quoted: msg })
}

// ── DEMOTE ───────────────────────────────────────────
async function demote({ sock, from, msg, reply, isGroup, isGroupAdmin, mentionedJids, isSuperOwner }) {
  if (!isGroup)      return reply('❌ Hanya di grup!')
  if (!isGroupAdmin) return reply('❌ Kamu bukan admin!')
  if (!mentionedJids.length) return reply('❌ Format: .demote @user')
  if (!await botIsAdmin(sock, from)) return reply('❌ Bot bukan admin grup!')

  const results = []
  for (const jid of mentionedJids) {
    const num = normalizeNumber(jid)
    if (isProtected(num) && !isSuperOwner) { results.push(`❌ @${num}: User ini dilindungi`); continue }
    try {
      await sock.groupParticipantsUpdate(from, [jid], 'demote')
      results.push(`✅ @${num} dicabut admin`)
    } catch { results.push(`❌ @${num}: Gagal`) }
  }

  await sock.sendMessage(from, {
    text: `⬇️ *DEMOTE*\n\n${results.join('\n')}`,
    mentions: mentionedJids
  }, { quoted: msg })
}

// ── LOCK GRUP ────────────────────────────────────────
async function lockGrup({ sock, from, msg, reply, isGroup, isGroupAdmin }) {
  if (!isGroup)      return reply('❌ Hanya di grup!')
  if (!isGroupAdmin) return reply('❌ Kamu bukan admin!')
  if (!await botIsAdmin(sock, from)) return reply('❌ Bot bukan admin grup!')
  try {
    await sock.groupSettingUpdate(from, 'announcement')
    await sock.sendMessage(from, { text: '🔒 *Grup dikunci!*\nHanya admin yang bisa mengirim pesan.' }, { quoted: msg })
  } catch { reply('❌ Gagal lock grup!') }
}

// ── UNLOCK GRUP ──────────────────────────────────────
async function unlockGrup({ sock, from, msg, reply, isGroup, isGroupAdmin }) {
  if (!isGroup)      return reply('❌ Hanya di grup!')
  if (!isGroupAdmin) return reply('❌ Kamu bukan admin!')
  if (!await botIsAdmin(sock, from)) return reply('❌ Bot bukan admin grup!')
  try {
    await sock.groupSettingUpdate(from, 'not_announcement')
    await sock.sendMessage(from, { text: '🔓 *Grup dibuka!*\nSemua member bisa mengirim pesan.' }, { quoted: msg })
  } catch { reply('❌ Gagal unlock grup!') }
}

// ── TAGALL ───────────────────────────────────────────
async function tagall({ sock, from, msg, reply, isGroup, isGroupAdmin, text }) {
  if (!isGroup)      return reply('❌ Hanya di grup!')
  if (!isGroupAdmin) return reply('❌ Kamu bukan admin!')
  try {
    const meta    = await sock.groupMetadata(from)
    const members = meta.participants.map(p => p.id)
    const pesan   = text || '📢 Perhatian semua member!'
    let tagTxt    = `📢 *TAGALL*\n\n${pesan}\n\n`
    members.forEach(m => { tagTxt += `@${normalizeNumber(m)} ` })
    await sock.sendMessage(from, { text: tagTxt.trim(), mentions: members }, { quoted: msg })
  } catch { reply('❌ Gagal tagall!') }
}

// ── HIDETAG ──────────────────────────────────────────
async function hidetag({ sock, from, msg, reply, isGroup, isGroupAdmin, text }) {
  if (!isGroup)      return reply('❌ Hanya di grup!')
  if (!isGroupAdmin) return reply('❌ Kamu bukan admin!')
  try {
    const meta    = await sock.groupMetadata(from)
    const members = meta.participants.map(p => p.id)
    const pesan   = text || '📢 Perhatian semua member!'
    // Hidetag: kirim pesan biasa tapi dengan mentions di balik teks normal
    await sock.sendMessage(from, { text: pesan, mentions: members }, { quoted: msg })
  } catch { reply('❌ Gagal hidetag!') }
}

// ── WARN ─────────────────────────────────────────────
async function warn({ sock, from, msg, reply, isGroup, isGroupAdmin, mentionedJids, text, isSuperOwner }) {
  if (!isGroup)      return reply('❌ Hanya di grup!')
  if (!isGroupAdmin) return reply('❌ Kamu bukan admin!')
  if (!mentionedJids.length) return reply('❌ Format: .warn @user [alasan]')
  if (!await botIsAdmin(sock, from)) return reply('❌ Bot bukan admin grup!')

  const group   = await getGroup(from)
  const warnings = group.warnings || {}
  const jid     = mentionedJids[0]
  const num     = normalizeNumber(jid)

  if (isProtected(num) && !isSuperOwner) return reply('❌ User ini tidak bisa diwarn!')

  warnings[num] = (warnings[num] || 0) + 1
  await updateGroup(from, { warnings })

  const alasan  = text.replace(/@\d+/g, '').trim() || 'Tidak disebutkan'
  const count   = warnings[num]

  if (count >= 3) {
    // Auto kick
    try {
      await sock.groupParticipantsUpdate(from, [jid], 'remove')
      delete warnings[num]
      await updateGroup(from, { warnings })
      await sock.sendMessage(from, {
        text: `⚠️ *WARN #${count}*\n\n@${num} telah mendapat 3 peringatan!\n🦶 Auto-kick dijalankan!\n\n📝 Alasan terakhir: ${alasan}`,
        mentions: [jid]
      }, { quoted: msg })
    } catch {
      await sock.sendMessage(from, {
        text: `⚠️ *WARN #${count}*\n\n@${num} — 3 peringatan!\n❌ Gagal auto-kick (bot bukan admin?)`,
        mentions: [jid]
      }, { quoted: msg })
    }
  } else {
    await sock.sendMessage(from, {
      text: `⚠️ *PERINGATAN #${count}/3*\n\n👤 @${num}\n📝 Alasan: ${alasan}\n\n${count === 2 ? '🚨 *Peringatan berikutnya akan auto-kick!*' : `${3 - count} peringatan lagi sebelum kick.`}`,
      mentions: [jid]
    }, { quoted: msg })
  }
}

// ── RESET WARN ───────────────────────────────────────
async function resetWarn({ sock, from, msg, reply, isGroup, isGroupAdmin, mentionedJids }) {
  if (!isGroup)      return reply('❌ Hanya di grup!')
  if (!isGroupAdmin) return reply('❌ Kamu bukan admin!')
  if (!mentionedJids.length) return reply('❌ Format: .resetwarn @user')

  const group    = await getGroup(from)
  const warnings = group.warnings || {}
  const jid      = mentionedJids[0]
  const num      = normalizeNumber(jid)

  delete warnings[num]
  await updateGroup(from, { warnings })

  await sock.sendMessage(from, {
    text: `✅ Peringatan @${num} direset!`,
    mentions: [jid]
  }, { quoted: msg })
}

// ── LIST WARN ────────────────────────────────────────
async function listWarn({ reply, from, isGroup, isGroupAdmin }) {
  if (!isGroup)      return reply('❌ Hanya di grup!')
  if (!isGroupAdmin) return reply('❌ Kamu bukan admin!')

  const group    = await getGroup(from)
  const warnings = group.warnings || {}
  const entries  = Object.entries(warnings).filter(([, v]) => v > 0)

  if (!entries.length) return reply('✅ Tidak ada member yang diwarn.')

  let txt = `╔══════════════════════════╗\n║   ⚠️ *DAFTAR WARN*       ║\n╚══════════════════════════╝\n\n`
  entries.forEach(([num, count]) => {
    const bar = '🟥'.repeat(count) + '⬜'.repeat(3 - count)
    txt += `• *${num}* ${bar} (${count}/3)\n`
  })
  await reply(txt)
}

// ── LIST MEMBER ──────────────────────────────────────
async function listMember({ sock, from, msg, reply, isGroup, isGroupAdmin }) {
  if (!isGroup)      return reply('❌ Hanya di grup!')
  if (!isGroupAdmin) return reply('❌ Kamu bukan admin!')

  try {
    const meta    = await sock.groupMetadata(from)
    const members = meta.participants
    const admins  = members.filter(p => p.admin)
    const regular = members.filter(p => !p.admin)

    let txt = `╔══════════════════════════╗\n║   👥 *DAFTAR MEMBER*     ║\n╚══════════════════════════╝\n\n`
    txt += `📊 Total: *${members.length} member* (${admins.length} admin, ${regular.length} member)\n\n`

    if (admins.length) {
      txt += `🛡️ *ADMIN (${admins.length})*\n`
      admins.forEach((p, i) => {
        const num  = normalizeNumber(p.id)
        const role = p.admin === 'superadmin' ? '👑' : '🛡️'
        txt += `${i + 1}. ${role} ${num}\n`
      })
      txt += '\n'
    }

    txt += `👤 *MEMBER (${regular.length})*\n`
    // Kirim dalam beberapa pesan kalau member banyak
    const chunks = []
    let chunk = txt
    regular.forEach((p, i) => {
      const num = normalizeNumber(p.id)
      const line = `${i + 1}. ${num}\n`
      if ((chunk + line).length > 3500) {
        chunks.push(chunk)
        chunk = line
      } else {
        chunk += line
      }
    })
    chunks.push(chunk)

    for (const c of chunks) {
      await sock.sendMessage(from, { text: c }, { quoted: msg })
      await new Promise(r => setTimeout(r, 500))
    }
  } catch (e) {
    reply('❌ Gagal ambil daftar member: ' + e.message)
  }
}

// ── SET WELCOME ──────────────────────────────────────
async function setWelcome({ reply, from, isGroup, isGroupAdmin, text }) {
  if (!isGroup)      return reply('❌ Hanya di grup!')
  if (!isGroupAdmin) return reply('❌ Kamu bukan admin!')
  if (!text) return reply('❌ Format: .setwelcome [teks]\nVariabel: {nama} {nomor} {grup} {total}')

  await updateGroup(from, { welcomeMsg: text, welcome: true })
  await reply(`✅ Pesan welcome diperbarui!\n\nPreview:\n_${text}_\n\n💡 Variabel tersedia: {nama} {nomor} {grup} {total}`)
}

// ── SET GOODBYE ──────────────────────────────────────
async function setGoodbye({ reply, from, isGroup, isGroupAdmin, text }) {
  if (!isGroup)      return reply('❌ Hanya di grup!')
  if (!isGroupAdmin) return reply('❌ Kamu bukan admin!')
  if (!text) return reply('❌ Format: .setbye [teks]\nVariabel: {nama} {nomor} {grup}')

  await updateGroup(from, { byeMsg: text })
  await reply(`✅ Pesan goodbye diperbarui!\n\nPreview:\n_${text}_\n\n💡 Variabel tersedia: {nama} {nomor} {grup}`)
}

// ── ANTILINK ─────────────────────────────────────────
async function antilink({ reply, from, isGroup, isGroupAdmin, text }) {
  if (!isGroup)      return reply('❌ Hanya di grup!')
  if (!isGroupAdmin) return reply('❌ Kamu bukan admin!')

  const val = (text || '').toLowerCase()
  if (!['on', 'off'].includes(val)) return reply('❌ Format: .antilink on/off')

  await updateGroup(from, { antiLink: val === 'on' })
  await reply(`${val === 'on' ? '✅ Anti-link *aktif*! Link WhatsApp/Telegram/dll akan dihapus.' : '❌ Anti-link *nonaktif*.'}`)
}

// ── GROUP INFO ───────────────────────────────────────
async function groupInfo({ sock, from, msg, reply, isGroup }) {
  if (!isGroup) return reply('❌ Hanya di grup!')
  try {
    const meta    = await sock.groupMetadata(from)
    const admins  = meta.participants.filter(p => p.admin).map(p => normalizeNumber(p.id))
    const group   = await getGroup(from)
    const created = new Date(meta.creation * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

    await sock.sendMessage(from, {
      text: `╔══════════════════════════╗\n║   📊 *INFO GRUP*         ║\n╚══════════════════════════╝\n\n📌 Nama    : *${meta.subject}*\n🆔 ID      : ${from}\n👥 Member  : *${meta.participants.length} orang*\n🛡️ Admin   : *${admins.length} orang*\n📅 Dibuat  : ${created}\n\n⚙️ *SETTING BOT*\n• Welcome  : ${group.welcome ? '✅ Aktif' : '❌ Nonaktif'}\n• Anti-Link: ${group.antiLink ? '✅ Aktif' : '❌ Nonaktif'}\n\n📝 Deskripsi:\n_${meta.desc || 'Tidak ada deskripsi'}_`
    }, { quoted: msg })
  } catch (e) {
    reply('❌ Gagal ambil info grup: ' + e.message)
  }
}

module.exports = {
  kick, promote, demote,
  lockGrup, unlockGrup,
  tagall, hidetag,
  warn, resetWarn, listWarn,
  listMember,
  setWelcome, setGoodbye,
  antilink,
  groupInfo
}
