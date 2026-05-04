require('dotenv').config()
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} = require('@whiskeysockets/baileys')
const pino           = require('pino')
const path           = require('path')
const fs             = require('fs-extra')
const { initDB }     = require('./database/db')
const msgHandler     = require('./handlers/messageHandler')
const groupHandler   = require('./handlers/groupHandler')

const SESSION_PATH = path.join(__dirname, '../sessions')
const logger       = pino({ level: 'silent' })
let sock
let reconnectCount = 0

// ══════════════════════════════════════════════════════
//   CONSOLE LOGGER — PINK FLOWER THEME
// ══════════════════════════════════════════════════════
const C = {
  reset:  '\x1b[0m',
  pink:   '\x1b[38;5;213m',
  hpink:  '\x1b[38;5;207m',
  white:  '\x1b[97m',
  gray:   '\x1b[90m',
  green:  '\x1b[92m',
  red:    '\x1b[91m',
  yellow: '\x1b[93m',
  cyan:   '\x1b[96m',
  bold:   '\x1b[1m',
}
function ts() { return `${C.gray}[${new Date().toLocaleTimeString('id-ID')}]${C.reset}` }
function clog(level, icon, msg) {
  const lv = { info: C.pink+C.bold, success: C.green+C.bold, error: C.red+C.bold, warn: C.yellow+C.bold, cmd: C.cyan+C.bold, sys: C.hpink+C.bold }
  console.log(`${ts()} ${(lv[level]||C.white)+icon+C.reset} ${C.white+msg+C.reset}`)
}
global.botLog = {
  info:    (m) => clog('info',    '🌸', m),
  success: (m) => clog('success', '✅', m),
  error:   (m) => clog('error',   '❌', m),
  warn:    (m) => clog('warn',    '⚠️ ', m),
  cmd:     (m) => clog('cmd',     '📨', m),
  sys:     (m) => clog('sys',     '⚙️ ', m),
}

function printBanner() {
  console.clear()
  const p = C.pink + C.bold, h = C.hpink + C.bold, w = C.white + C.bold, r = C.reset
  console.log(`\n${p}  ╔══════════════════════════════════════════════════════╗`)
  console.log(`  ║                                                      ║`)
  console.log(`  ║   ${h}🌸🌸  M A I I L O U V E   B O T  v5  🌸🌸${p}     ║`)
  console.log(`  ║                                                      ║`)
  console.log(`  ║   ${w}  ✨  WhatsApp Bot — Powered by Baileys           ${p}║`)
  console.log(`  ║   ${w}  🤖  AI | 🎮 Game | 💰 Ekonomi | 🛡️ Admin Grup  ${p}║`)
  console.log(`  ║                                                      ║`)
  console.log(`  ╚══════════════════════════════════════════════════════╝${r}\n`)
}

function printOnline(number) {
  const p = C.pink+C.bold, g = C.green+C.bold, r = C.reset
  console.log(`${p}  ╔══════════════════════════════════════════════════════╗${r}`)
  console.log(`${p}  ║   ${g}  ✅  BOT ONLINE & SIAP DIGUNAKAN!  ✅${p}           ║${r}`)
  console.log(`${p}  ║   ${C.white}  📱  ${number.padEnd(44)}${p}║${r}`)
  console.log(`${p}  ║   ${C.cyan}  🌸  Ketik .menu untuk melihat semua fitur        ${p}║${r}`)
  console.log(`${p}  ╚══════════════════════════════════════════════════════╝${r}\n`)
}

async function startBot() {
  printBanner()
  botLog.sys('Menginisialisasi database...')
  await initDB()
  await fs.ensureDir(SESSION_PATH)
  await fs.ensureDir(path.join(__dirname, '../data'))
  await fs.ensureDir(path.join(__dirname, '../assets'))
  botLog.sys('Menghubungkan ke WhatsApp...')

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH)
  let version
  try { const l = await fetchLatestBaileysVersion(); version = l.version }
  catch { version = [2, 3000, 1015901307] }

  sock = makeWASocket({
    version, logger,
    printQRInTerminal: false,
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
    generateHighQualityLinkPreview: true,
    getMessage: async () => ({ conversation: '' }),
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 25000,
    retryRequestDelayMs: 1000,
    maxMsgRetryCount: 3,
  })

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.clear()
      printBanner()
      const p = C.hpink+C.bold, r = C.reset
      console.log(`${p}  ╔════════════════════════════════════════╗`)
      console.log(`  ║  📱  SCAN QR CODE DI BAWAH INI!        ║`)
      console.log(`  ║  WhatsApp → Perangkat Tertaut → [ + ]  ║`)
      console.log(`  ╚════════════════════════════════════════╝${r}\n`)
      require('qrcode-terminal').generate(qr, { small: true })
      botLog.info('Scan QR Code sekarang!')
    }

    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode
      const shouldReconnect = code !== DisconnectReason.loggedOut
      botLog.error(`Koneksi terputus! Code: ${code}`)
      if (shouldReconnect) {
        reconnectCount++
        const delay = Math.min(3000 * reconnectCount, 30000)
        botLog.warn(`Reconnecting dalam ${delay/1000}s... (ke-${reconnectCount})`)
        setTimeout(startBot, delay)
      } else {
        botLog.error('Logged out! Hapus folder sessions/ dan jalankan ulang.')
        process.exit(0)
      }
    } else if (connection === 'open') {
      reconnectCount = 0
      const num = sock.user.id.split(':')[0]
      console.clear()
      printBanner()
      printOnline(num)
      botLog.success(`Bot terhubung: ${num}`)
      try {
        const ownerNum = process.env.OWNER_NUMBER
        if (ownerNum) {
          await sock.sendMessage(ownerNum + '@s.whatsapp.net', {
            text: `🌸 *Maiilouve Bot v5 Online!*\n\n✅ Bot aktif & siap.\n📱 Nomor: ${num}\n⏰ ${new Date().toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})}\n\nKetik *.menu* untuk lihat semua fitur.`
          })
        }
      } catch {}
    }
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('messages.upsert', async (m) => {
    try {
      if (m.type !== 'notify') return
      const msg = m.messages[0]
      if (!msg?.message) return
      if (msg.key.remoteJid === 'status@broadcast') return
      await msgHandler(sock, msg)
    } catch (err) { botLog.error(`msgHandler: ${err.message}`) }
  })

  sock.ev.on('group-participants.update', async (update) => {
    try { await groupHandler(sock, update) }
    catch (err) { botLog.error(`groupHandler: ${err.message}`) }
  })

  return sock
}

process.on('SIGINT', () => { botLog.warn('Bot dimatikan (SIGINT)'); process.exit(0) })
process.on('uncaughtException',  (e) => botLog.error(`Uncaught: ${e.message}`))
process.on('unhandledRejection', (r) => botLog.error(`Unhandled: ${r}`))

startBot().catch(console.error)
module.exports = { getSock: () => sock }
