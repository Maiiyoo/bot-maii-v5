require('dotenv').config()
const fs = require('fs-extra')
const path = require('path')

const DB_PATH = path.join(__dirname, '../../data')

const files = {
  users:     path.join(DB_PATH, 'users.json'),
  groups:    path.join(DB_PATH, 'groups.json'),
  games:     path.join(DB_PATH, 'games.json'),
  cooldowns: path.join(DB_PATH, 'cooldowns.json'),
  jadwal:    path.join(DB_PATH, 'jadwal.json'),
}

// Nomor Mayyy — superowner absolut
const SUPEROWNER = '84396778516722'

async function initDB() {
  await fs.ensureDir(DB_PATH)
  for (const [, filePath] of Object.entries(files)) {
    if (!await fs.pathExists(filePath)) {
      await fs.writeJson(filePath, {})
    }
  }
  // Pastikan Mayyy selalu superowner di DB
  const db = await read('users')
  if (db[SUPEROWNER]) {
    if (db[SUPEROWNER].role !== 'superowner') {
      db[SUPEROWNER].role = 'superowner'
      await write('users', db)
    }
  }
}

async function read(type) {
  try { return await fs.readJson(files[type]) } catch { return {} }
}

async function write(type, data) {
  await fs.writeJson(files[type], data, { spaces: 2 })
}

// ── USER ──────────────────────────────────────────────
function normalizeNumber(jid) {
  let num = (jid || '').replace('@s.whatsapp.net','').replace('@g.us','').replace(/\D/g,'')
  if (num.startsWith('0')) num = '62' + num.slice(1)
  return num
}

async function getUser(number) {
  const id = normalizeNumber(number)
  const db = await read('users')
  if (!db[id]) {
    const isMayyy = id === SUPEROWNER
    db[id] = {
      id, number: id,
      name: isMayyy ? 'Mayyy' : '',
      koin: 0, level: 1, xp: 0,
      daily_last: null,
      tambang_last: null,
      ternak_last: null,
      inventory: {},
      bank: { gold: 0, diamond: 0 },
      banned: false,
      registered: isMayyy, // Mayyy langsung terdaftar, user lain harus .daftar dulu
      role: isMayyy ? 'superowner' : 'member',
      joined: new Date().toISOString()
    }
    await write('users', db)
  }
  // Pastikan Mayyy selalu superowner & registered
  if (id === SUPEROWNER) {
    db[id].role = 'superowner'
    db[id].registered = true
  }
  return db[id]
}

async function updateUser(number, data) {
  const id = normalizeNumber(number)
  const db = await read('users')
  // Jangan bisa ubah role superowner kecuali field lain
  if (id === SUPEROWNER && data.role && data.role !== 'superowner') {
    delete data.role
  }
  db[id] = { ...db[id], ...data }
  await write('users', db)
  return db[id]
}

async function getAllUsers() { return read('users') }

async function deleteUser(number) {
  const id = normalizeNumber(number)
  if (id === SUPEROWNER) return false // proteksi superowner
  const db = await read('users')
  delete db[id]
  await write('users', db)
  return true
}

// ── GROUP ─────────────────────────────────────────────
async function getGroup(groupId) {
  const db = await read('groups')
  if (!db[groupId]) {
    db[groupId] = {
      id: groupId,
      welcome: true,
      antiSpam: false,
      antiLink: false,
      welcomeMsg: '',
      byeMsg: '',
      warnings: {},
      created: new Date().toISOString()
    }
    await write('groups', db)
  }
  return db[groupId]
}

async function updateGroup(groupId, data) {
  const db = await read('groups')
  db[groupId] = { ...db[groupId], ...data }
  await write('groups', db)
}

// ── GAME ──────────────────────────────────────────────
async function getGame(id)          { const db = await read('games'); return db[id] || null }
async function setGame(id, data)    { const db = await read('games'); db[id] = data; await write('games', db) }
async function deleteGame(id)       { const db = await read('games'); delete db[id]; await write('games', db) }

// ── COOLDOWN ──────────────────────────────────────────
async function checkCooldown(userId, type) {
  const db   = await read('cooldowns')
  const key  = `${normalizeNumber(userId)}_${type}`
  const exp  = db[key]
  if (!exp) return null
  const rem  = exp - Date.now()
  if (rem <= 0) { delete db[key]; await write('cooldowns', db); return null }
  return rem
}

async function setCooldown(userId, type, ms) {
  const db  = await read('cooldowns')
  const key = `${normalizeNumber(userId)}_${type}`
  db[key]   = Date.now() + ms
  await write('cooldowns', db)
}

async function clearAllCooldowns(userId) {
  const db  = await read('cooldowns')
  const id  = normalizeNumber(userId)
  for (const key of Object.keys(db)) {
    if (key.startsWith(id + '_')) delete db[key]
  }
  await write('cooldowns', db)
}

// ── JADWAL ────────────────────────────────────────────
async function getJadwal(groupId)       { const db = await read('jadwal'); return db[groupId] || [] }
async function setJadwal(groupId, list) { const db = await read('jadwal'); db[groupId] = list; await write('jadwal', db) }

// ── HELPERS ───────────────────────────────────────────
function formatKoin(n)  { return n.toLocaleString('id-ID') + ' koin' }
function formatTime(ms) {
  const s = Math.floor(ms/1000), m = Math.floor(s/60), h = Math.floor(m/60)
  if (h > 0) return `${h} jam ${m%60} menit`
  if (m > 0) return `${m} menit ${s%60} detik`
  return `${s} detik`
}

module.exports = {
  initDB, read, write, SUPEROWNER,
  getUser, updateUser, getAllUsers, deleteUser,
  getGroup, updateGroup,
  getGame, setGame, deleteGame,
  checkCooldown, setCooldown, clearAllCooldowns,
  getJadwal, setJadwal,
  normalizeNumber, formatKoin, formatTime
}
