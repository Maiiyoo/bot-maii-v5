/**
 * BANK & INVESTASI
 * Gold  : base 100,000 koin, naik 10% tiap 6 jam
 * Diamond: base 200,000 koin, naik 10% tiap 6 jam
 */

const { getUser, updateUser, read, write } = require('../database/db')

const BASE_PRICE = { gold: 100000, diamond: 200000 }
const INTERVAL_MS = 6 * 60 * 60 * 1000 // 6 jam
const GROWTH_RATE  = 0.10               // 10%

// ── Hitung harga saat ini ─────────────────────────────
async function getHarga() {
  const db   = await read('users')
  const meta = db.__market || { startTime: Date.now(), cycles: 0 }
  const now  = Date.now()
  const cycles = Math.floor((now - meta.startTime) / INTERVAL_MS)

  if (cycles !== meta.cycles) {
    meta.cycles = cycles
    db.__market  = meta
    await write('users', db)
  }

  const multiplier = Math.pow(1 + GROWTH_RATE, cycles)
  return {
    gold:    Math.round(BASE_PRICE.gold    * multiplier),
    diamond: Math.round(BASE_PRICE.diamond * multiplier),
    cycles,
    nextReset: meta.startTime + (cycles + 1) * INTERVAL_MS,
    multiplier: multiplier.toFixed(2)
  }
}

// ── FORMAT ───────────────────────────────────────────
function fmt(n) { return n.toLocaleString('id-ID') }
function fmtTime(ms) {
  const total = Math.max(0, ms - Date.now())
  const h = Math.floor(total / 3600000)
  const m = Math.floor((total % 3600000) / 60000)
  return `${h}j ${m}m`
}

// ── INFO BANK / HARGA ─────────────────────────────────
async function infoBank({ reply, user }) {
  const harga  = await getHarga()
  const inv    = user.bank || { gold: 0, diamond: 0 }
  const nilaiG = inv.gold    * harga.gold
  const nilaiD = inv.diamond * harga.diamond
  const total  = nilaiG + nilaiD

  await reply(
    `╔══════════════════════════════╗\n` +
    `║   🏦  *MAIILOUVE BANK*  🏦   ║\n` +
    `╚══════════════════════════════╝\n\n` +
    `📈 *Harga Pasar Sekarang*\n` +
    `🟡 Gold    : *${fmt(harga.gold)} koin*\n` +
    `💎 Diamond : *${fmt(harga.diamond)} koin*\n\n` +
    `📊 Growth: *+10%* per 6 jam\n` +
    `🔄 Naik lagi dalam: *${fmtTime(harga.nextReset)}*\n` +
    `📉 Total kenaikan: *x${harga.multiplier}* (siklus ke-${harga.cycles})\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `💼 *Investasimu*\n` +
    `🟡 Gold    : *${inv.gold}* unit (≈ ${fmt(nilaiG)} koin)\n` +
    `💎 Diamond : *${inv.diamond}* unit (≈ ${fmt(nilaiD)} koin)\n` +
    `💰 Total   : *${fmt(total)} koin*\n\n` +
    `💵 Saldo koin: *${fmt(user.koin)} koin*\n\n` +
    `📋 Command:\n` +
    `• .beli gold [jml]    — Beli gold\n` +
    `• .beli diamond [jml] — Beli diamond\n` +
    `• .jual gold [jml]    — Jual gold\n` +
    `• .jual diamond [jml] — Jual diamond`
  )
}

// ── BELI ASET ─────────────────────────────────────────
async function beliAset({ reply, user, senderNumber, args }) {
  const jenis = (args[0] || '').toLowerCase()
  const jumlah = parseInt(args[1])

  if (!['gold', 'diamond'].includes(jenis))
    return reply('❌ Format: .beli gold [jumlah] atau .beli diamond [jumlah]')
  if (!jumlah || jumlah < 1)
    return reply('❌ Masukkan jumlah yang valid! Minimal 1.')

  const harga    = await getHarga()
  const hargaSat = harga[jenis]
  const total    = hargaSat * jumlah

  if (user.koin < total)
    return reply(
      `❌ Koin tidak cukup!\n\n` +
      `💸 Butuh: *${fmt(total)} koin*\n` +
      `💰 Punya: *${fmt(user.koin)} koin*\n` +
      `📉 Kurang: *${fmt(total - user.koin)} koin*`
    )

  const inv    = user.bank || { gold: 0, diamond: 0 }
  inv[jenis]  += jumlah

  await updateUser(senderNumber, {
    koin: user.koin - total,
    bank: inv
  })

  const icon = jenis === 'gold' ? '🟡' : '💎'
  await reply(
    `╔══════════════════════╗\n` +
    `║   ✅ *BELI BERHASIL*  ║\n` +
    `╚══════════════════════╝\n\n` +
    `${icon} ${jenis.toUpperCase()} +*${jumlah}* unit\n` +
    `💸 Bayar: *${fmt(total)} koin*\n` +
    `💰 Sisa : *${fmt(user.koin - total)} koin*\n\n` +
    `📦 Total ${jenis}: *${inv[jenis]}* unit\n\n` +
    `_Harga naik 10% tiap 6 jam. Jual saat harga tinggi!_ 📈`
  )
}

// ── JUAL ASET ─────────────────────────────────────────
async function jualAset({ reply, user, senderNumber, args }) {
  const jenis = (args[0] || '').toLowerCase()
  const jumlah = parseInt(args[1])

  if (!['gold', 'diamond'].includes(jenis))
    return reply('❌ Format: .jual gold [jumlah] atau .jual diamond [jumlah]')
  if (!jumlah || jumlah < 1)
    return reply('❌ Masukkan jumlah yang valid! Minimal 1.')

  const inv = user.bank || { gold: 0, diamond: 0 }

  if ((inv[jenis] || 0) < jumlah)
    return reply(
      `❌ ${jenis.toUpperCase()} tidak cukup!\n\n` +
      `📦 Punya: *${inv[jenis] || 0}* unit\n` +
      `📉 Mau jual: *${jumlah}* unit`
    )

  const harga    = await getHarga()
  const hargaSat = harga[jenis]
  const total    = hargaSat * jumlah

  inv[jenis] -= jumlah

  await updateUser(senderNumber, {
    koin: user.koin + total,
    bank: inv
  })

  const icon = jenis === 'gold' ? '🟡' : '💎'
  await reply(
    `╔══════════════════════╗\n` +
    `║   💰 *JUAL BERHASIL*  ║\n` +
    `╚══════════════════════╝\n\n` +
    `${icon} ${jenis.toUpperCase()} -*${jumlah}* unit\n` +
    `💵 Dapat : *${fmt(total)} koin*\n` +
    `💰 Saldo : *${fmt(user.koin + total)} koin*\n\n` +
    `📦 Sisa ${jenis}: *${inv[jenis]}* unit`
  )
}

// ── PORTFOLIO ─────────────────────────────────────────
async function portfolio({ reply, user }) {
  const harga  = await getHarga()
  const inv    = user.bank || { gold: 0, diamond: 0 }
  const nilaiG = inv.gold    * harga.gold
  const nilaiD = inv.diamond * harga.diamond
  const total  = nilaiG + nilaiD

  if (inv.gold === 0 && inv.diamond === 0)
    return reply(`📊 Kamu belum punya investasi!\n\nKetik *.bank* untuk lihat harga dan cara beli.`)

  await reply(
    `╔══════════════════════════════╗\n` +
    `║   📊 *PORTFOLIO INVESTASI*  ║\n` +
    `╚══════════════════════════════╝\n\n` +
    `🟡 *Gold*\n` +
    `   Punya : ${inv.gold} unit\n` +
    `   Harga : ${fmt(harga.gold)}/unit\n` +
    `   Nilai : *${fmt(nilaiG)} koin*\n\n` +
    `💎 *Diamond*\n` +
    `   Punya : ${inv.diamond} unit\n` +
    `   Harga : ${fmt(harga.diamond)}/unit\n` +
    `   Nilai : *${fmt(nilaiD)} koin*\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `💼 Total Nilai: *${fmt(total)} koin*\n` +
    `💰 Saldo Koin : *${fmt(user.koin)} koin*\n` +
    `📈 Harga naik lagi: *${fmtTime(harga.nextReset)}*`
  )
}

module.exports = { infoBank, beliAset, jualAset, portfolio }
