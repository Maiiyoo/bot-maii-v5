require('dotenv').config()
const { getUser, updateUser, getAllUsers, checkCooldown, setCooldown, normalizeNumber, formatTime } = require('../database/db')
const moment = require('moment-timezone')

const TZ           = process.env.TIMEZONE     || 'Asia/Jakarta'
const TAMBANG_CD   = parseInt(process.env.TAMBANG_COOLDOWN) || 180000
const DAILY_BASE   = parseInt(process.env.DAILY_KOIN)       || 500
const STEAL_CHANCE = parseInt(process.env.STEAL_SUCCESS_RATE)|| 40
const STEAL_PCT    = parseInt(process.env.STEAL_PERCENT)     || 10

const ITEMS = {
  cangkul:   { harga:500,  deskripsi:'+50 koin/tambang',        tipe:'alat' },
  pickaxe:   { harga:2000, deskripsi:'+150 koin/tambang',       tipe:'alat' },
  ayam:      { harga:300,  deskripsi:'Ternak +50 koin/jam',     tipe:'ternak', hasilJam:50 },
  kambing:   { harga:800,  deskripsi:'Ternak +100 koin/jam',    tipe:'ternak', hasilJam:100 },
  sapi:      { harga:1500, deskripsi:'Ternak +200 koin/jam',    tipe:'ternak', hasilJam:200 },
  pelindung: { harga:1000, deskripsi:'Cegah pencurian (1x)',    tipe:'perlindungan' },
  bom:       { harga:800,  deskripsi:'Hancurkan pelindung lawan',tipe:'serangan' },
}

// ── SALDO ────────────────────────────────────────────
async function saldo({ reply, user, senderNumber, mentionedJids }) {
  let u = user, num = senderNumber
  if (mentionedJids.length) { num = normalizeNumber(mentionedJids[0]); u = await getUser(num) }
  await reply(`╔══════════════════════╗\n║     💰 *SALDO*       ║\n╚══════════════════════╝\n\n👤 *${u.name||num}*\n📱 ${num}\n💰 Koin  : *${u.koin.toLocaleString('id-ID')}*\n⭐ Level : ${u.level}\n📊 XP    : ${u.xp}`)
}

// ── DAILY ────────────────────────────────────────────
async function daily({ reply, senderNumber, user }) {
  const now       = moment().tz(TZ)
  const lastDaily = user.daily_last ? moment(user.daily_last).tz(TZ) : null
  if (lastDaily && now.isSame(lastDaily,'day')) {
    const rem = now.clone().endOf('day').diff(now)
    return reply(`⏳ Sudah ambil daily hari ini!\n\nReset dalam *${formatTime(rem)}* lagi`)
  }
  const bonus    = Math.floor(Math.random() * 300) + DAILY_BASE
  const newKoin  = user.koin + bonus
  await updateUser(senderNumber, { koin: newKoin, daily_last: now.toISOString() })
  await reply(`╔══════════════════════╗\n║   🎁 *DAILY REWARD*  ║\n╚══════════════════════╝\n\n✅ Berhasil klaim!\n💰 +*${bonus.toLocaleString('id-ID')} koin*\n💼 Total: *${newKoin.toLocaleString('id-ID')} koin*\n\n_Kembali besok!_ 🌸`)
}

// ── TAMBANG ──────────────────────────────────────────
async function tambang({ reply, senderNumber, user }) {
  const rem = await checkCooldown(senderNumber, 'tambang')
  if (rem) return reply(`⏳ Cooldown tambang!\nTunggu *${formatTime(rem)}* lagi.`)

  const inv     = user.inventory || {}
  let bonus = 0, alatMsg = ''
  if (inv.pickaxe > 0) { bonus = 150; alatMsg = '⛏️ Pickaxe aktif' }
  else if (inv.cangkul > 0) { bonus = 50; alatMsg = '🪚 Cangkul aktif' }

  const hasil   = Math.floor(Math.random() * 200) + 50 + bonus
  const xpGain  = Math.floor(hasil / 10)
  const newXp   = (user.xp||0) + xpGain
  const newLvl  = Math.floor(newXp / 1000) + 1
  const newKoin = user.koin + hasil

  await updateUser(senderNumber, { koin: newKoin, xp: newXp, level: newLvl })
  await setCooldown(senderNumber, 'tambang', TAMBANG_CD)

  const items = ['💎 Berlian','🪨 Batu Berharga','⚙️ Besi','🥇 Emas','💍 Permata','🔮 Kristal']
  const item  = items[Math.floor(Math.random() * items.length)]

  await reply(`╔══════════════════════╗\n║     ⛏️ *TAMBANG*     ║\n╚══════════════════════╝\n\n${item}${alatMsg?'\n'+alatMsg:''}\n\n💰 +*${hasil.toLocaleString('id-ID')} koin*\n⭐ +${xpGain} XP\n💼 Total: *${newKoin.toLocaleString('id-ID')} koin*\n\n_Cooldown 3 menit_ ⏳`)
}

// ── TERNAK ───────────────────────────────────────────
async function ternak({ reply, senderNumber, user }) {
  const inv   = user.inventory || {}
  const ternakItems = ['ayam','kambing','sapi'].filter(t => (inv[t]||0) > 0)
  if (!ternakItems.length) return reply(`🐄 Belum punya ternak!\n\n*.beli ayam* — 300 koin\n*.beli kambing* — 800 koin\n*.beli sapi* — 1500 koin`)

  const last     = user.ternak_last ? new Date(user.ternak_last) : new Date(user.joined)
  const jamBerlalu = Math.min((Date.now() - last) / 3600000, 24)
  let total = 0, detail = ''

  for (const t of ternakItems) {
    const hasil = Math.floor(ITEMS[t].hasilJam * inv[t] * jamBerlalu)
    total += hasil
    detail += `• ${t} x${inv[t]}: +${hasil.toLocaleString('id-ID')} koin\n`
  }

  if (!total) return reply(`🐄 *Ternakmu:*\n\n${detail}\n_Tunggu beberapa saat untuk panen._`)

  const newKoin = user.koin + total
  await updateUser(senderNumber, { koin: newKoin, ternak_last: new Date().toISOString() })
  await reply(`╔══════════════════════╗\n║     🐄 *TERNAK*      ║\n╚══════════════════════╝\n\n⏱️ ${jamBerlalu.toFixed(1)} jam\n\n${detail}\n💰 +*${total.toLocaleString('id-ID')} koin*\n💼 Saldo: *${newKoin.toLocaleString('id-ID')} koin*`)
}

// ── TOKO ─────────────────────────────────────────────
async function toko({ reply }) {
  let list = `╔══════════════════════════╗\n║     🛒 *TOKO MAIILOUVE*  ║\n╚══════════════════════════╝\n\n`
  for (const [k, v] of Object.entries(ITEMS)) {
    list += `• *.beli ${k}* — *${v.harga.toLocaleString('id-ID')} koin*\n  _${v.deskripsi}_\n\n`
  }
  list += `_Jual item dengan_ *.jual [item]* _(70% harga beli)_`
  await reply(list)
}

// ── BELI ─────────────────────────────────────────────
async function beli({ reply, senderNumber, user, text }) {
  if (!text) return toko({ reply })
  const name = text.toLowerCase().trim()
  const item = ITEMS[name]
  if (!item) return reply(`❌ Item *${name}* tidak ada di toko.\nKetik *.toko* untuk daftar.`)
  if (user.koin < item.harga) return reply(`❌ Koin kurang!\nKamu: *${user.koin.toLocaleString('id-ID')}*\nHarga: *${item.harga.toLocaleString('id-ID')}*`)
  const inv = { ...user.inventory }; inv[name] = (inv[name]||0) + 1
  const newKoin = user.koin - item.harga
  await updateUser(senderNumber, { koin: newKoin, inventory: inv })
  await reply(`✅ Beli *${name}* berhasil!\n💸 -${item.harga.toLocaleString('id-ID')} koin\n💼 Sisa: *${newKoin.toLocaleString('id-ID')} koin*`)
}

// ── JUAL ─────────────────────────────────────────────
async function jual({ reply, senderNumber, user, text }) {
  if (!text) return reply('❌ Format: .jual [item]')
  const name = text.toLowerCase().trim()
  const item = ITEMS[name]
  const inv  = { ...user.inventory }
  if (!item)               return reply(`❌ Item *${name}* tidak dikenal.`)
  if (!(inv[name] > 0))    return reply(`❌ Kamu tidak punya *${name}*.`)
  const harga = Math.floor(item.harga * 0.7)
  inv[name]--; if (!inv[name]) delete inv[name]
  const newKoin = user.koin + harga
  await updateUser(senderNumber, { koin: newKoin, inventory: inv })
  await reply(`✅ Jual *${name}* berhasil!\n💰 +${harga.toLocaleString('id-ID')} koin\n💼 Saldo: *${newKoin.toLocaleString('id-ID')} koin*`)
}

// ── TRANSFER ─────────────────────────────────────────
async function transfer({ reply, sock, msg, from, senderNumber, user, mentionedJids, args }) {
  if (!mentionedJids.length) return reply('❌ Format: .transfer @user jumlah\nContoh: .transfer @udin 1000')
  const targetNum = normalizeNumber(mentionedJids[0])
  if (targetNum === senderNumber) return reply('❌ Tidak bisa transfer ke diri sendiri!')
  const jumlahStr = args.find(a => /^\d+$/.test(a))
  if (!jumlahStr) return reply('❌ Masukkan jumlah koin!\nContoh: .transfer @udin 1000')
  const jumlah = parseInt(jumlahStr)
  if (jumlah < 100)       return reply('❌ Minimal transfer 100 koin!')
  if (jumlah > user.koin) return reply(`❌ Koin kurang! Kamu punya *${user.koin.toLocaleString('id-ID')}*`)
  const target = await getUser(targetNum)
  await updateUser(senderNumber, { koin: user.koin - jumlah })
  await updateUser(targetNum,    { koin: target.koin + jumlah })
  await sock.sendMessage(from, {
    text: `╔══════════════════════╗\n║    💸 *TRANSFER*     ║\n╚══════════════════════╝\n\n✅ Berhasil!\n👤 Ke: *${target.name||targetNum}*\n💰 Jumlah: *${jumlah.toLocaleString('id-ID')} koin*\n💼 Sisa: *${(user.koin-jumlah).toLocaleString('id-ID')} koin*`,
    mentions: [mentionedJids[0]]
  }, { quoted: msg })
  try { await sock.sendMessage(targetNum+'@s.whatsapp.net', { text:`💰 Kamu menerima transfer!\n\n👤 Dari: ${user.name||senderNumber}\n💰 Jumlah: *${jumlah.toLocaleString('id-ID')} koin*` }) } catch {}
}

// ── CURI ─────────────────────────────────────────────
async function curi({ reply, sock, senderNumber, user, mentionedJids, from }) {
  if (!mentionedJids.length) return reply('❌ Format: .curi @user')
  const rem = await checkCooldown(senderNumber, 'curi')
  if (rem) return reply(`⏳ Cooldown mencuri! Tunggu *${formatTime(rem)}*`)
  const targetNum = normalizeNumber(mentionedJids[0])
  if (targetNum === senderNumber) return reply('❌ Tidak bisa mencuri dari diri sendiri!')
  const target = await getUser(targetNum)
  if (target.koin < 100) return reply('❌ Target tidak punya cukup koin!')

  // Cek pelindung
  const tInv = { ...target.inventory }
  if (tInv.pelindung > 0) {
    tInv.pelindung--; if (!tInv.pelindung) delete tInv.pelindung
    await updateUser(targetNum, { inventory: tInv })
    await setCooldown(senderNumber, 'curi', 300000)
    return reply(`🛡️ *Gagal!* @${targetNum} punya pelindung! Kamu balik pulang...`, { mentions:[mentionedJids[0]] })
  }

  const berhasil = Math.random() * 100 < STEAL_CHANCE
  await setCooldown(senderNumber, 'curi', berhasil ? 600000 : 300000)

  if (berhasil) {
    const curian = Math.floor(target.koin * STEAL_PCT / 100)
    await updateUser(senderNumber, { koin: user.koin + curian })
    await updateUser(targetNum,    { koin: target.koin - curian })
    await sock.sendMessage(from, {
      text: `╔══════════════════════╗\n║    🦹 *BERHASIL!*    ║\n╚══════════════════════╝\n\n✅ Kamu mencuri dari @${targetNum}\n💰 +*${curian.toLocaleString('id-ID')} koin* (10%)\n💼 Saldo: *${(user.koin+curian).toLocaleString('id-ID')} koin*`,
      mentions: [mentionedJids[0]]
    })
    try { await sock.sendMessage(targetNum+'@s.whatsapp.net', { text:`🚨 Kamu dicuri!\n\n👤 Pencuri: ${user.name||senderNumber}\n💰 Hilang: *${curian.toLocaleString('id-ID')} koin*\n\nBeli *.beli pelindung* biar aman!` }) } catch {}
  } else {
    const denda = Math.floor(user.koin * 0.05)
    await updateUser(senderNumber, { koin: Math.max(0, user.koin - denda) })
    await sock.sendMessage(from, {
      text: `╔══════════════════════╗\n║   🦹 *KETAHUAN!*     ║\n╚══════════════════════╝\n\n❌ Gagal mencuri dari @${targetNum}!\n💸 Denda: -*${denda.toLocaleString('id-ID')} koin*\n💼 Saldo: *${Math.max(0,user.koin-denda).toLocaleString('id-ID')} koin*`,
      mentions: [mentionedJids[0]]
    })
  }
}

// ── LEADERBOARD ──────────────────────────────────────
async function leaderboard({ reply }) {
  const all    = await getAllUsers()
  const sorted = Object.values(all).sort((a,b) => b.koin - a.koin).slice(0,10)
  if (!sorted.length) return reply('❌ Belum ada data user.')
  const medals = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟']
  let lb = `╔══════════════════════════╗\n║  💰 *LEADERBOARD KOIN*   ║\n╚══════════════════════════╝\n\n`
  sorted.forEach((u,i) => { lb += `${medals[i]} *${u.name||u.number}* — ${u.koin.toLocaleString('id-ID')} koin\n` })
  await reply(lb)
}

// ── PROFIL ───────────────────────────────────────────
async function profil({ reply, user, senderNumber, mentionedJids }) {
  let u = user, num = senderNumber
  if (mentionedJids.length) { num = normalizeNumber(mentionedJids[0]); u = await getUser(num) }
  const inv     = u.inventory || {}
  const invList = Object.entries(inv).map(([k,v])=>`${k} x${v}`).join(', ')||'Kosong'
  await reply(`╔══════════════════════════╗\n║      👤 *PROFIL*          ║\n╚══════════════════════════╝\n\n🏷️ Nama  : *${u.name||num}*\n📱 No    : ${num}\n💰 Koin  : *${u.koin.toLocaleString('id-ID')}*\n⭐ Level : *${u.level}*\n📊 XP    : *${u.xp}*\n🎒 Inv   : ${invList}\n📅 Join  : ${new Date(u.joined).toLocaleDateString('id-ID')}`)
}

// ── INVENTORY ────────────────────────────────────────
async function inventory({ reply, user }) {
  const inv  = user.inventory || {}
  const keys = Object.keys(inv)
  if (!keys.length) return reply(`🎒 Inventorymu kosong!\n\nBeli item dengan *.toko*`)
  let txt = `╔══════════════════════╗\n║    🎒 *INVENTORY*    ║\n╚══════════════════════╝\n\n`
  for (const [item, jml] of Object.entries(inv)) {
    txt += `• *${item}* x${jml}${ITEMS[item]?' — '+ITEMS[item].deskripsi:''}\n`
  }
  await reply(txt)
}

module.exports = { saldo, daily, tambang, ternak, toko, beli, jual, transfer, curi, leaderboard, profil, inventory }
