const axios  = require('axios')
const { updateUser, checkCooldown, setCooldown } = require('../database/db')
const { randInt, randItem } = require('../utils/helper')

// Soal aktif per chat
const activeQ  = new Map()
const activeTA = new Map() // tebak angka
const activeWC = new Map() // word chain / sambung kata
const activeHM = new Map() // hangman

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   TRIVIA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function trivia({ reply, from }) {
  const existing = activeQ.get(from + '_soal')
  if (existing && Date.now() < existing.expires)
    return reply('❗ Masih ada soal aktif! Jawab dulu dengan *.jawab [jawaban]*')
  try {
    const res = await axios.get('https://opentdb.com/api.php?amount=1&type=multiple&encode=url3986', { timeout: 8000 })
    const q   = res.data.results[0]
    const question  = decodeURIComponent(q.question)
    const correct   = decodeURIComponent(q.correct_answer)
    const incorrect = q.incorrect_answers.map(a => decodeURIComponent(a))
    const options   = [...incorrect, correct].sort(() => Math.random() - 0.5)
    const labels    = ['A','B','C','D']
    const correctLbl = labels[options.indexOf(correct)]
    let optTxt = ''
    options.forEach((o, i) => { optTxt += `${labels[i]}. ${o}\n` })
    activeQ.set(from + '_soal', { answer: correctLbl, answerFull: correct, type: 'trivia', expires: Date.now() + 30000 })
    await reply(`╔═══════════════════╗\n║   🧠 *TRIVIA*      ║\n╚═══════════════════╝\n\n❓ ${question}\n\n${optTxt}\nJawab: *.jawab A/B/C/D*  ⏰ 30 detik  💰 +150 koin`)
  } catch {
    await reply('❌ Gagal ambil soal trivia. Coba lagi!')
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   TEBAK KATA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const KATA_LIST = [
  { kata:'gajah',         hint:'Hewan besar berkaki 4 dengan belalai' },
  { kata:'matahari',      hint:'Benda langit yang bersinar siang hari' },
  { kata:'pelangi',       hint:'Fenomena alam berwarna-warni setelah hujan' },
  { kata:'jembatan',      hint:'Penghubung dua tempat di atas air atau jurang' },
  { kata:'astronaut',     hint:'Orang yang pergi ke luar angkasa' },
  { kata:'perpustakaan',  hint:'Tempat menyimpan dan meminjam buku' },
  { kata:'komputer',      hint:'Alat elektronik untuk bekerja dan bermain' },
  { kata:'kupu-kupu',     hint:'Serangga cantik bersayap warna-warni' },
  { kata:'gunung berapi', hint:'Gunung yang bisa meletus mengeluarkan lava' },
  { kata:'pesawat',       hint:'Kendaraan yang terbang di udara' },
  { kata:'dokter',        hint:'Orang yang mengobati orang sakit' },
  { kata:'nanas',         hint:'Buah berduri dengan mahkota daun, rasanya manis asam' },
  { kata:'kelinci',       hint:'Hewan berbulu putih dengan telinga panjang' },
  { kata:'jerapah',       hint:'Hewan leher panjang yang tinggal di Afrika' },
  { kata:'merpati',       hint:'Burung putih lambang perdamaian' },
  { kata:'kecoa',         hint:'Serangga coklat yang sering ada di dapur' },
  { kata:'badak',         hint:'Hewan besar dengan cula di hidungnya' },
  { kata:'layang-layang', hint:'Mainan yang diterbangkan menggunakan angin' },
  { kata:'senter',        hint:'Alat penerang portabel yang pakai baterai' },
  { kata:'payung',        hint:'Alat pelindung dari hujan dan matahari' },
]

async function tebakKata({ reply, from }) {
  const existing = activeQ.get(from + '_soal')
  if (existing && Date.now() < existing.expires)
    return reply('❗ Masih ada soal aktif! Jawab dulu dengan *.jawab [jawaban]*')
  const item = randItem(KATA_LIST)
  const acak = item.kata.split('').sort(() => Math.random() - 0.5).join('')
  activeQ.set(from + '_soal', { answer: item.kata, hint: item.hint, type: 'tebak', expires: Date.now() + 60000 })
  await reply(`╔════════════════════╗\n║  🔤 *TEBAK KATA*   ║\n╚════════════════════╝\n\n🔀 Huruf acak: *${acak.toUpperCase()}*\n💡 Hint: _${item.hint}_\n\nJawab: *.jawab [kata]*  ⏰ 60 detik  💰 +100 koin`)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   TEBAK-TEBAKAN (TTS)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const TTS = [
  { soal:'Makin diisi makin ringan. Apa itu?',            jawab:'balon' },
  { soal:'Punya gigi tapi tidak bisa menggigit. Apa?',    jawab:'sisir' },
  { soal:'Semakin dicuci semakin kotor. Apa itu?',        jawab:'air' },
  { soal:'Apa yang ada di tengah-tengah Jakarta?',        jawab:'a' },
  { soal:'Ada tangan tapi tak bisa memegang. Apa?',       jawab:'jam' },
  { soal:'Semakin tua semakin muda. Apa itu?',            jawab:'lilin' },
  { soal:'Tanpa kaki tapi bisa keliling dunia. Apa?',     jawab:'bola' },
  { soal:'Dibawa kemana-mana tapi tidak bisa dipindah?',  jawab:'nama' },
  { soal:'Ditendang tidak sakit, tapi tetap melambung?',  jawab:'bola' },
  { soal:'Punya mata tapi tidak bisa melihat. Apa?',      jawab:'jarum' },
  { soal:'Semakin panjang semakin pendek umurnya. Apa?',  jawab:'lilin' },
  { soal:'Bisa berbicara tanpa mulut, berbunyi tanpa suara?', jawab:'buku' },
  { soal:'Apa yang jatuh tapi tidak pernah terluka?',     jawab:'hujan' },
  { soal:'Punya kepala dan ekor tapi tidak punya badan?', jawab:'koin' },
]

async function tebakTebakan({ reply, from }) {
  const existing = activeQ.get(from + '_soal')
  if (existing && Date.now() < existing.expires)
    return reply('❗ Masih ada soal aktif! Jawab dulu dengan *.jawab [jawaban]*')
  const item = randItem(TTS)
  activeQ.set(from + '_soal', { answer: item.jawab, type: 'tts', expires: Date.now() + 120000 })
  await reply(`╔══════════════════════╗\n║  🧩 *TEBAK-TEBAKAN*  ║\n╚══════════════════════╝\n\n❓ ${item.soal}\n\nJawab: *.jawab [jawaban]*  ⏰ 2 menit  💰 +75 koin`)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   JAWAB (universal)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function jawab({ reply, from, senderNumber, text, user }) {
  if (!text) return reply('❌ Format: .jawab [jawaban]')
  const soal = activeQ.get(from + '_soal')
  if (!soal || Date.now() > soal.expires) return reply('❌ Tidak ada soal aktif!\nCoba *.trivia*, *.tebak*, atau *.tts*')
  const jawaban = text.trim().toLowerCase()
  const correct = (soal.answer || '').toLowerCase()
  if (jawaban === correct) {
    activeQ.delete(from + '_soal')
    const reward = soal.type === 'trivia' ? 150 : soal.type === 'tebak' ? 100 : soal.type === 'math' ? 50 : 75
    await updateUser(senderNumber, { koin: user.koin + reward })
    return reply(`✅ *BENAR!* 🎉\n\n${soal.answerFull ? `Jawaban: *${soal.answerFull}*\n` : `Kata: *${soal.answer}*\n`}💰 +${reward} koin!`)
  }
  await reply(`❌ Salah! Coba lagi...${soal.hint ? `\n💡 Hint: _${soal.hint}_` : ''}`)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   RPS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const RPS_MAP   = { batu:'🪨', gunting:'✂️', kertas:'📄' }
const RPS_BEATS = { batu:'gunting', gunting:'kertas', kertas:'batu' }

async function rps({ reply, senderNumber, text, user }) {
  const pilihan = text?.toLowerCase().trim()
  if (!['batu','gunting','kertas'].includes(pilihan))
    return reply('❌ Format: .rps [batu / gunting / kertas]')
  const bot = randItem(['batu','gunting','kertas'])
  let hasil = '', reward = 0
  if (pilihan === bot)               { hasil = '🤝 *SERI!*';        reward = 10 }
  else if (RPS_BEATS[pilihan]===bot) { hasil = '🎉 *KAMU MENANG!*'; reward = 50 }
  else                               { hasil = '😔 *BOT MENANG!*';  reward = -20 }
  const newKoin = Math.max(0, user.koin + reward)
  await updateUser(senderNumber, { koin: newKoin })
  await reply(`╔══════════════════╗\n║  🪨✂️📄 *RPS*    ║\n╚══════════════════╝\n\n👤 Kamu : ${RPS_MAP[pilihan]} ${pilihan}\n🤖 Bot  : ${RPS_MAP[bot]} ${bot}\n\n${hasil}\n${reward >= 0 ? `💰 +${reward}` : `💸 ${reward}`} koin\n💼 Saldo: *${newKoin.toLocaleString('id-ID')} koin*`)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   GACHA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const GACHA_ITEMS = [
  { nama:'💎 Berlian Langka', rarity:'Legendary', nilai:5000,  chance:2 },
  { nama:'⭐ Bintang Emas',   rarity:'Epic',      nilai:1500,  chance:8 },
  { nama:'🔮 Kristal Ajaib',  rarity:'Rare',      nilai:600,   chance:20 },
  { nama:'🥈 Perak',          rarity:'Uncommon',  nilai:180,   chance:35 },
  { nama:'🪨 Batu Biasa',     rarity:'Common',    nilai:30,    chance:35 },
]

async function gacha({ reply, senderNumber, user }) {
  const COST = 100
  if (user.koin < COST) return reply(`❌ Butuh *${COST} koin* untuk gacha!\nKamu: *${user.koin} koin*`)
  const roll = randInt(1, 100)
  let cumulative = 0, item = GACHA_ITEMS[GACHA_ITEMS.length - 1]
  for (const g of GACHA_ITEMS) {
    cumulative += g.chance
    if (roll <= cumulative) { item = g; break }
  }
  const newKoin = user.koin - COST + item.nilai
  await updateUser(senderNumber, { koin: newKoin })
  await reply(`╔══════════════════╗\n║   🎰 *GACHA*      ║\n╚══════════════════╝\n\n🎲 Roll: ${roll}/100\n\n${item.nama}\n✨ Rarity: *${item.rarity}*\n💰 Nilai: +${item.nilai} koin\n\n💸 Biaya: -${COST} koin\n💼 Saldo: *${newKoin.toLocaleString('id-ID')} koin*`)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   SLOT MACHINE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const SLOT_SYMBOLS = ['🍒','🍋','🍊','⭐','💎','🔔','7️⃣']

async function slot({ reply, senderNumber, user }) {
  const COST = 50
  if (user.koin < COST) return reply(`❌ Butuh *${COST} koin* untuk main slot!\nKamu: *${user.koin} koin*`)
  const s = [randItem(SLOT_SYMBOLS), randItem(SLOT_SYMBOLS), randItem(SLOT_SYMBOLS)]
  let reward = 0, hasil = ''
  if (s[0]===s[1] && s[1]===s[2]) {
    if (s[0]==='💎')       { reward = 2000; hasil = '🏆 *JACKPOT!! +2000 koin!*' }
    else if (s[0]==='7️⃣')  { reward = 1000; hasil = '🎰 *LUCKY 7!! +1000 koin!*' }
    else                    { reward = 300;  hasil = '✅ *Tiga sama! +300 koin*' }
  } else if (s[0]===s[1] || s[1]===s[2] || s[0]===s[2]) {
    reward = 75; hasil = '👌 *Dua sama +75 koin*'
  } else {
    reward = 0; hasil = '❌ *Tidak ada yang sama!*'
  }
  const newKoin = Math.max(0, user.koin - COST + reward)
  await updateUser(senderNumber, { koin: newKoin })
  await reply(`╔══════════════════════╗\n║  🎰 *SLOT MACHINE*   ║\n╚══════════════════════╝\n\n┌─────────────────┐\n│   ${s[0]}  ${s[1]}  ${s[2]}   │\n└─────────────────┘\n\n${hasil}\n💸 Biaya: -${COST} koin\n💼 Saldo: *${newKoin.toLocaleString('id-ID')} koin*`)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   TEBAK ANGKA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function tebakAngka({ reply, from, senderNumber }) {
  const key = `${from}_${senderNumber}_angka`
  const existing = activeTA.get(key)
  if (existing && Date.now() < existing.expires)
    return reply(`❌ Kamu masih punya tebak angka aktif!\nKetik *.nebak [angka]*\n💡 Hint: Antara *${existing.min}* dan *${existing.max}*`)
  const angka = Math.floor(Math.random() * 100) + 1
  activeTA.set(key, { angka, min:1, max:100, attempts:0, maxAttempts:7, expires: Date.now() + 5*60*1000 })
  await reply(`🎯 *TEBAK ANGKA!*\n\nAku sudah pilih angka antara *1 - 100*.\nKamu punya *7 kesempatan* untuk menebak!\n\nKetik *.nebak [angka]* untuk menebak.\nContoh: *.nebak 50*\n\n⏰ Sesi aktif 5 menit`)
}

async function nebak({ reply, from, senderNumber, text, user }) {
  const key = `${from}_${senderNumber}_angka`
  const game = activeTA.get(key)
  if (!game || Date.now() > game.expires) {
    activeTA.delete(key)
    return reply(`❌ Tidak ada sesi tebak angka aktif!\nKetik *.tebakangka* untuk mulai.`)
  }
  const tebakan = parseInt(text)
  if (isNaN(tebakan) || tebakan < 1 || tebakan > 100)
    return reply('❌ Masukkan angka antara 1 - 100!')
  game.attempts++
  const sisaKesempatan = game.maxAttempts - game.attempts
  if (tebakan === game.angka) {
    activeTA.delete(key)
    const bonus = Math.max(50, 200 - (game.attempts - 1) * 25)
    await updateUser(senderNumber, { koin: user.koin + bonus })
    return reply(`🎉 *BENAR!*\n\nAngkanya adalah *${game.angka}*!\n✅ Menebak dalam *${game.attempts}* percobaan!\n\n💰 Bonus: *+${bonus} koin*${game.attempts === 1 ? '\n🏆 *PERFECT! Tebak pertama!*' : ''}`)
  }
  if (game.attempts >= game.maxAttempts) {
    activeTA.delete(key)
    return reply(`💀 *GAME OVER!*\n\nAngka yang aku pilih adalah *${game.angka}*.\nTebakanmu: *${tebakan}* — ${tebakan > game.angka ? 'Kebesaran ⬇️' : 'Kekecilan ⬆️'}\n\nCoba lagi dengan *.tebakangka* 🎯`)
  }
  if (tebakan > game.angka) game.max = Math.min(game.max, tebakan - 1)
  else                       game.min = Math.max(game.min, tebakan + 1)
  const hint = tebakan > game.angka ? 'Kebesaran ⬇️' : 'Kekecilan ⬆️'
  const barFill = Math.round(((game.maxAttempts - sisaKesempatan) / game.maxAttempts) * 7)
  const bar = '🟥'.repeat(barFill) + '⬜'.repeat(7 - barFill)
  await reply(`🎯 *${tebakan}* — *${hint}*\n\n💡 Hint: Antara *${game.min}* dan *${game.max}*\n❤️ Sisa: ${bar} (${sisaKesempatan} kesempatan)\n\nKetik *.nebak [angka]* untuk tebak lagi!`)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   HANGMAN (GANTUNG)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const HM_WORDS = [
  'gajah','harimau','kelelawar','nanas','pisang','komputer','pesawat',
  'jembatan','matahari','pelangi','astronaut','perpustakaan','kupu-kupu',
  'dinosaurus','sungai','gunung','lautan','bintang','bunga','pohon',
  'kamera','telepon','keyboard','monitor','internet','program','robot',
  'sepeda','motor','mobil','kereta','kapal','helicopter','submarine',
]

const HM_STAGES = [
  '💀\n╠══╦══╗\n║  ║  ║\n║     ║\n║     ║\n║\n╚══════',
  '😰\n╠══╦══╗\n║  ║  ║\n║  😮 ║\n║     ║\n║\n╚══════',
  '😨\n╠══╦══╗\n║  ║  ║\n║  😮 ║\n║  |\n║\n╚══════',
  '😱\n╠══╦══╗\n║  ║  ║\n║  😮 ║\n║ \\|\n║\n╚══════',
  '😵\n╠══╦══╗\n║  ║  ║\n║  😮 ║\n║ \\|/\n║\n╚══════',
  '😵\n╠══╦══╗\n║  ║  ║\n║  😮 ║\n║ \\|/\n║  |\n╚══════',
  '☠️\n╠══╦══╗\n║  ║  ║\n║  😖 ║\n║ \\|/\n║  |\n╚═ / \\ ',
]

function renderHM(game) {
  const display = game.word.split('').map(c => c === ' ' ? ' ' : (game.guessed.includes(c) ? c.toUpperCase() : '_')).join(' ')
  const wrong = game.wrong.join(' ') || '-'
  const stage = HM_STAGES[Math.min(game.errors, HM_STAGES.length - 1)]
  return `🔤 *HANGMAN*\n\n${stage}\n\n📝 Kata: *${display}*\n❌ Salah (${game.errors}/${game.maxErrors}): ${wrong}\n\nTebak huruf: *.huruf [a-z]*`
}

async function hangman({ reply, from, senderNumber }) {
  const key = `${from}_${senderNumber}_hm`
  const existing = activeHM.get(key)
  if (existing && Date.now() < existing.expires)
    return reply(`❗ Sudah ada game hangman aktif!\n${renderHM(existing)}`)
  const word = randItem(HM_WORDS)
  const game = { word, guessed: [], wrong: [], errors: 0, maxErrors: 6, expires: Date.now() + 10 * 60 * 1000 }
  activeHM.set(key, game)
  await reply(`🎮 *HANGMAN DIMULAI!*\n\n${renderHM(game)}\n\n⏰ 10 menit  💰 +200 koin jika menang`)
}

async function huruf({ reply, from, senderNumber, text, user }) {
  const key = `${from}_${senderNumber}_hm`
  const game = activeHM.get(key)
  if (!game || Date.now() > game.expires) {
    activeHM.delete(key)
    return reply('❌ Tidak ada game hangman aktif!\nKetik *.hangman* untuk mulai.')
  }
  const letter = (text || '').trim().toLowerCase().charAt(0)
  if (!letter || !/[a-z]/.test(letter)) return reply('❌ Masukkan satu huruf! Contoh: *.huruf a*')
  if (game.guessed.includes(letter) || game.wrong.includes(letter))
    return reply(`❌ Huruf *${letter.toUpperCase()}* sudah pernah ditebak!`)
  if (game.word.includes(letter)) {
    game.guessed.push(letter)
    const allFound = game.word.split('').filter(c => c !== ' ').every(c => game.guessed.includes(c))
    if (allFound) {
      activeHM.delete(key)
      await updateUser(senderNumber, { koin: user.koin + 200 })
      return reply(`🎉 *MENANG!*\n\nKata: *${game.word.toUpperCase()}*\n✅ Kamu berhasil menebak!\n💰 +200 koin!`)
    }
    await reply(`✅ Huruf *${letter.toUpperCase()}* benar!\n\n${renderHM(game)}`)
  } else {
    game.wrong.push(letter)
    game.errors++
    if (game.errors >= game.maxErrors) {
      activeHM.delete(key)
      return reply(`💀 *GAME OVER!*\n\nKata yang benar adalah: *${game.word.toUpperCase()}*\nCoba lagi dengan *.hangman*`)
    }
    await reply(`❌ Huruf *${letter.toUpperCase()}* tidak ada!\n\n${renderHM(game)}`)
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   MATEMATIKA CEPAT (math duel)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function matematik({ reply, from }) {
  const existing = activeQ.get(from + '_soal')
  if (existing && Date.now() < existing.expires)
    return reply('❗ Masih ada soal aktif! Jawab dulu dengan *.jawab [angka]*')
  const ops = ['+','-','×']
  const op  = randItem(ops)
  let a, b, answer, soal
  if (op === '+') { a = randInt(10, 200); b = randInt(10, 200); answer = a + b; soal = `${a} + ${b}` }
  else if (op === '-') { a = randInt(50, 300); b = randInt(1, a); answer = a - b; soal = `${a} - ${b}` }
  else { a = randInt(2, 30); b = randInt(2, 20); answer = a * b; soal = `${a} × ${b}` }
  activeQ.set(from + '_soal', { answer: String(answer), type: 'math', expires: Date.now() + 15000 })
  await reply(`╔════════════════════════╗\n║  🧮 *MATEMATIKA CEPAT*  ║\n╚════════════════════════╝\n\n❓ Berapa: *${soal}* = ?\n\nJawab: *.jawab [angka]*  ⏰ 15 detik  💰 +50 koin\n_Siapa cepat dia yang menang!_`)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   SUIT (EMOJI SUIT)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function suit({ reply, senderNumber, text, user }) {
  const choices = ['api','air','angin']
  const beats   = { api:'angin', air:'api', angin:'air' }
  const emoji   = { api:'🔥', air:'💧', angin:'🌪️' }
  const pilihan = text?.toLowerCase().trim()
  if (!choices.includes(pilihan))
    return reply('❌ Format: .suit [api / air / angin]')
  const bot = randItem(choices)
  let hasil = '', reward = 0
  if (pilihan === bot)                 { hasil = '🤝 *SERI!*';        reward = 10 }
  else if (beats[pilihan] === bot)     { hasil = '🎉 *KAMU MENANG!*'; reward = 60 }
  else                                 { hasil = '😔 *BOT MENANG!*';  reward = -25 }
  const newKoin = Math.max(0, user.koin + reward)
  await updateUser(senderNumber, { koin: newKoin })
  await reply(`╔══════════════════════╗\n║  🔥💧🌪️  *SUIT*      ║\n╚══════════════════════╝\n\n👤 Kamu : ${emoji[pilihan]} ${pilihan}\n🤖 Bot  : ${emoji[bot]} ${bot}\n\n${hasil}\n${reward >= 0 ? `💰 +${reward}` : `💸 ${reward}`} koin\n💼 Saldo: *${newKoin.toLocaleString('id-ID')} koin*\n\n_🔥 mengalahkan 🌪️ | 💧 mengalahkan 🔥 | 🌪️ mengalahkan 💧_`)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   SPIN THE WHEEL (PUTAR RODA)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function spin({ reply, senderNumber, user }) {
  const COST = 75
  if (user.koin < COST) return reply(`❌ Butuh *${COST} koin* untuk putar roda!\nKamu: *${user.koin} koin*`)
  const RODA = [
    { label:'💀 ZONK!',      reward:-COST, chance:15 },
    { label:'💰 +50 koin',   reward:50,    chance:25 },
    { label:'💰 +100 koin',  reward:100,   chance:25 },
    { label:'💰 +200 koin',  reward:200,   chance:15 },
    { label:'💰 +500 koin',  reward:500,   chance:12 },
    { label:'🎰 +1000 koin', reward:1000,  chance:6  },
    { label:'🏆 +3000 koin', reward:3000,  chance:2  },
  ]
  const roll = randInt(1, 100)
  let cum = 0, hasil = RODA[1]
  for (const r of RODA) { cum += r.chance; if (roll <= cum) { hasil = r; break } }
  const newKoin = Math.max(0, user.koin - COST + (hasil.reward > 0 ? hasil.reward : 0))
  await updateUser(senderNumber, { koin: newKoin })
  const segments = RODA.map((r, i) => i % 2 === 0 ? `🔵 ${r.label}` : `🟣 ${r.label}`)
  await reply(`╔═════════════════════╗\n║  🎡 *PUTAR RODA!*   ║\n╚═════════════════════╝\n\n${segments.join(' │ ')}\n\n▶️ Roda berputar...\n\n✨ *${hasil.label}*\n\n💸 Biaya: -${COST} koin\n💼 Saldo: *${newKoin.toLocaleString('id-ID')} koin*`)
}

module.exports = {
  trivia, tebakKata, tebakTebakan, jawab,
  rps, gacha, slot,
  tebakAngka, nebak,
  hangman, huruf,
  matematik, suit, spin
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   🎲 JUDI — DADU (Bet & Roll)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// .dadu [bet] [1-6 / ganjil / genap / besar / kecil]
async function dadu({ reply, senderNumber, text, user }) {
  const parts = (text || '').trim().split(/\s+/)
  const bet   = parseInt(parts[0])
  const pilih = (parts[1] || '').toLowerCase()

  const valid = ['1','2','3','4','5','6','ganjil','genap','besar','kecil']
  if (!bet || bet < 100) return reply('❌ Format: *.dadu [bet] [pilihan]*\nContoh: *.dadu 500 ganjil*\n\n_Pilihan: 1-6 | ganjil | genap | besar | kecil_\n_Bet minimum: 100 koin_')
  if (!valid.includes(pilih)) return reply('❌ Pilihan tidak valid!\nPilih: *1-6 | ganjil | genap | besar | kecil*')
  if (user.koin < bet) return reply(`❌ Koin tidak cukup!\nKamu: *${user.koin.toLocaleString('id-ID')} koin*\nBet: *${bet.toLocaleString('id-ID')} koin*`)

  const dadu1 = randInt(1, 6)
  const dadu2 = randInt(1, 6)
  const total = dadu1 + dadu2
  const single = randInt(1, 6) // untuk tebak angka

  // Tentukan hasil
  let menang = false, multiplier = 1
  if (['1','2','3','4','5','6'].includes(pilih)) {
    menang = single === parseInt(pilih); multiplier = 5
    const daduRoll = single
    const daduEmoji = ['','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣']
    const reward = menang ? bet * multiplier : -bet
    const newKoin = Math.max(0, user.koin + reward)
    await updateUser(senderNumber, { koin: newKoin })
    return reply(
      `╔═══════════════════╗\n║  🎲 *DADU*          ║\n╚═══════════════════╝\n\n` +
      `🎲 Hasil: ${daduEmoji[daduRoll]} (${daduRoll})\n` +
      `👤 Pilihan: *${pilih}*\n\n` +
      `${menang ? `🎉 *MENANG!* x${multiplier}\n💰 +${(bet * (multiplier-1)).toLocaleString('id-ID')} koin` : `😔 *KALAH!*\n💸 -${bet.toLocaleString('id-ID')} koin`}\n` +
      `💼 Saldo: *${newKoin.toLocaleString('id-ID')} koin*`
    )
  } else if (pilih === 'ganjil') {
    menang = total % 2 !== 0; multiplier = 2
  } else if (pilih === 'genap') {
    menang = total % 2 === 0; multiplier = 2
  } else if (pilih === 'besar') {
    menang = total >= 8; multiplier = 2  // total 8-12
  } else if (pilih === 'kecil') {
    menang = total <= 6; multiplier = 2  // total 2-6
  }

  const reward  = menang ? bet * multiplier - bet : -bet
  const newKoin = Math.max(0, user.koin + reward)
  await updateUser(senderNumber, { koin: newKoin })

  const diceEmoji = ['','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣']
  await reply(
    `╔═══════════════════╗\n║  🎲 *DADU JUDI*     ║\n╚═══════════════════╝\n\n` +
    `🎲 Dadu: ${diceEmoji[dadu1]} + ${diceEmoji[dadu2]} = *${total}*\n` +
    `📊 (${total % 2 === 0 ? 'Genap' : 'Ganjil'} | ${total >= 8 ? 'Besar' : total <= 6 ? 'Kecil' : 'Tengah'})\n` +
    `👤 Pilihan: *${pilih}*\n\n` +
    `${menang ? `🎉 *MENANG!* x${multiplier}\n💰 +${(bet * (multiplier-1)).toLocaleString('id-ID')} koin` : `😔 *KALAH!*\n💸 -${bet.toLocaleString('id-ID')} koin`}\n` +
    `💼 Saldo: *${newKoin.toLocaleString('id-ID')} koin*`
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   🃏 BLACKJACK (21)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const activeBJ = new Map()

const BJ_DECK = [
  {label:'A♠',val:11},{label:'2♠',val:2},{label:'3♠',val:3},{label:'4♠',val:4},
  {label:'5♠',val:5},{label:'6♠',val:6},{label:'7♠',val:7},{label:'8♠',val:8},
  {label:'9♠',val:9},{label:'10♠',val:10},{label:'J♠',val:10},{label:'Q♠',val:10},{label:'K♠',val:10},
  {label:'A♥',val:11},{label:'2♥',val:2},{label:'3♥',val:3},{label:'4♥',val:4},
  {label:'5♥',val:5},{label:'6♥',val:6},{label:'7♥',val:7},{label:'8♥',val:8},
  {label:'9♥',val:9},{label:'10♥',val:10},{label:'J♥',val:10},{label:'Q♥',val:10},{label:'K♥',val:10},
]

function bjTotal(cards) {
  let total = cards.reduce((s, c) => s + c.val, 0)
  let aces  = cards.filter(c => c.label.startsWith('A')).length
  while (total > 21 && aces > 0) { total -= 10; aces-- }
  return total
}

function bjDisplay(cards) { return cards.map(c => c.label).join(' | ') }

async function blackjack({ reply, from, senderNumber, text, user }) {
  if (activeBJ.has(from + '_' + senderNumber)) {
    const g = activeBJ.get(from + '_' + senderNumber)
    return reply(`❗ Kamu masih punya game blackjack aktif!\n\nKartu kamu: *${bjDisplay(g.player)}* = ${bjTotal(g.player)}\nDealer: *${g.dealer[0].label}* | ❓\n\n*.hit* — Ambil kartu\n*.stand* — Berhenti`)
  }
  const bet = parseInt(text)
  if (!bet || bet < 100) return reply('❌ Format: *.bj [bet]*\nContoh: *.bj 1000*\n_Bet minimum: 100 koin_')
  if (user.koin < bet) return reply(`❌ Koin tidak cukup!\nKamu: *${user.koin.toLocaleString('id-ID')} koin*`)

  const deck = [...BJ_DECK].sort(() => Math.random() - 0.5)
  const player = [deck.pop(), deck.pop()]
  const dealer = [deck.pop(), deck.pop()]

  // Check blackjack langsung
  if (bjTotal(player) === 21) {
    const reward = Math.floor(bet * 1.5)
    await updateUser(senderNumber, { koin: user.koin + reward })
    return reply(
      `╔═══════════════════╗\n║  🃏 *BLACKJACK!*   ║\n╚═══════════════════╝\n\n` +
      `🎉 *BLACKJACK! MENANG!*\n\n` +
      `👤 Kartu kamu: *${bjDisplay(player)}* = *21*\n` +
      `🤖 Dealer: *${bjDisplay(dealer)}* = ${bjTotal(dealer)}\n\n` +
      `💰 +${reward.toLocaleString('id-ID')} koin (x1.5)\n💼 Saldo: *${(user.koin + reward).toLocaleString('id-ID')} koin*`
    )
  }

  activeBJ.set(from + '_' + senderNumber, { player, dealer, deck, bet, expires: Date.now() + 5 * 60 * 1000 })

  await reply(
    `╔═══════════════════╗\n║  🃏 *BLACKJACK*    ║\n╚═══════════════════╝\n\n` +
    `👤 Kartu kamu: *${bjDisplay(player)}* = *${bjTotal(player)}*\n` +
    `🤖 Dealer: *${dealer[0].label}* | ❓\n\n` +
    `💵 Bet: *${bet.toLocaleString('id-ID')} koin*\n\n` +
    `*.hit* — Ambil kartu lagi\n*.stand* — Berhenti & buka dealer`
  )
}

async function bjHit({ reply, from, senderNumber, user }) {
  const key = from + '_' + senderNumber
  const g = activeBJ.get(key)
  if (!g || Date.now() > g.expires) { activeBJ.delete(key); return reply('❌ Tidak ada game blackjack aktif! Ketik *.bj [bet]*') }

  g.player.push(g.deck.pop())
  const total = bjTotal(g.player)

  if (total > 21) {
    activeBJ.delete(key)
    const newKoin = Math.max(0, user.koin - g.bet)
    await updateUser(senderNumber, { koin: newKoin })
    return reply(
      `╔═══════════════════╗\n║  🃏 *BLACKJACK*    ║\n╚═══════════════════╝\n\n` +
      `💥 *BUST! KALAH!*\n\n` +
      `👤 Kartu kamu: *${bjDisplay(g.player)}* = *${total}*\n\n` +
      `💸 -${g.bet.toLocaleString('id-ID')} koin\n💼 Saldo: *${newKoin.toLocaleString('id-ID')} koin*`
    )
  }

  if (total === 21) return bjStand({ reply, from, senderNumber, user: { ...user, _bj_key: key } })

  await reply(
    `👤 Kartu kamu: *${bjDisplay(g.player)}* = *${total}*\n` +
    `🤖 Dealer: *${g.dealer[0].label}* | ❓\n\n` +
    `*.hit* — Ambil lagi\n*.stand* — Berhenti`
  )
}

async function bjStand({ reply, from, senderNumber, user }) {
  const key = from + '_' + senderNumber
  const g = activeBJ.get(key)
  if (!g || Date.now() > g.expires) { activeBJ.delete(key); return reply('❌ Tidak ada game blackjack aktif!') }

  activeBJ.delete(key)
  // Dealer harus hit sampai >= 17
  while (bjTotal(g.dealer) < 17) g.dealer.push(g.deck.pop())

  const pTotal = bjTotal(g.player)
  const dTotal = bjTotal(g.dealer)
  let hasil = '', reward = 0

  if (dTotal > 21 || pTotal > dTotal) {
    hasil = '🎉 *MENANG!*'; reward = g.bet
  } else if (pTotal === dTotal) {
    hasil = '🤝 *SERI!*';   reward = 0
  } else {
    hasil = '😔 *KALAH!*';  reward = -g.bet
  }

  const newKoin = Math.max(0, user.koin + reward)
  await updateUser(senderNumber, { koin: newKoin })
  await reply(
    `╔═══════════════════╗\n║  🃏 *BLACKJACK*    ║\n╚═══════════════════╝\n\n` +
    `👤 Kamu : *${bjDisplay(g.player)}* = *${pTotal}*\n` +
    `🤖 Dealer: *${bjDisplay(g.dealer)}* = *${dTotal}*\n\n` +
    `${hasil}\n${reward > 0 ? `💰 +${reward.toLocaleString('id-ID')} koin` : reward < 0 ? `💸 -${g.bet.toLocaleString('id-ID')} koin` : '↩️ Bet dikembalikan'}\n` +
    `💼 Saldo: *${newKoin.toLocaleString('id-ID')} koin*`
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   🎡 ROLET (Roulette)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// .rolet [bet] [merah/hitam/0-36]
const ROLET_RED = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]

async function rolet({ reply, senderNumber, text, user }) {
  const parts = (text || '').trim().split(/\s+/)
  const bet   = parseInt(parts[0])
  const pilih = (parts[1] || '').toLowerCase()

  if (!bet || bet < 100) return reply('❌ Format: *.rolet [bet] [pilihan]*\nContoh: *.rolet 500 merah*\n\n_Pilihan: merah | hitam | 0-36_\n_Bet minimum: 100 koin_')
  if (user.koin < bet)   return reply(`❌ Koin tidak cukup! Kamu: *${user.koin.toLocaleString('id-ID')} koin*`)

  const num = randInt(0, 36)
  const isRed   = ROLET_RED.includes(num)
  const color   = num === 0 ? '🟢' : isRed ? '🔴' : '⚫'
  const colorTxt = num === 0 ? 'Hijau' : isRed ? 'Merah' : 'Hitam'

  let menang = false, multiplier = 1
  if (pilih === 'merah')  { menang = isRed && num !== 0;    multiplier = 2 }
  else if (pilih === 'hitam') { menang = !isRed && num !== 0; multiplier = 2 }
  else if (/^\d+$/.test(pilih) && parseInt(pilih) >= 0 && parseInt(pilih) <= 36) {
    menang = num === parseInt(pilih); multiplier = 36
  } else {
    return reply('❌ Pilihan tidak valid!\nPilih: *merah | hitam | 0-36*')
  }

  const reward  = menang ? bet * (multiplier - 1) : -bet
  const newKoin = Math.max(0, user.koin + reward)
  await updateUser(senderNumber, { koin: newKoin })

  await reply(
    `╔═══════════════════════╗\n║  🎡 *ROULETTE*         ║\n╚═══════════════════════╝\n\n` +
    `🎡 Roda berputar...\n\n` +
    `🎯 Hasil: ${color} *${num}* (${colorTxt})\n` +
    `👤 Pilihan: *${pilih}*\n` +
    (multiplier === 36 ? `📊 Multiplier: *x36*\n` : '') +
    `\n${menang ? `🎉 *MENANG!*\n💰 +${(bet * (multiplier-1)).toLocaleString('id-ID')} koin` : `😔 *KALAH!*\n💸 -${bet.toLocaleString('id-ID')} koin`}\n` +
    `💼 Saldo: *${newKoin.toLocaleString('id-ID')} koin*`
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   🪙 LEMPAR KOIN (Coin Flip)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function coinflip({ reply, senderNumber, text, user }) {
  const parts = (text || '').trim().split(/\s+/)
  const bet   = parseInt(parts[0])
  const pilih = (parts[1] || '').toLowerCase()
  if (!bet || bet < 100) return reply('❌ Format: *.flip [bet] [heads/tails]*\nContoh: *.flip 1000 heads*\n_Bet min: 100 koin_')
  if (!['heads','tails','angka','gambar'].includes(pilih)) return reply('❌ Pilihan: *heads* atau *tails* (atau: angka/gambar)')
  if (user.koin < bet) return reply(`❌ Koin tidak cukup! Kamu: *${user.koin.toLocaleString('id-ID')} koin*`)

  const hasil = Math.random() < 0.5 ? 'heads' : 'tails'
  const hasilAlt = hasil === 'heads' ? 'angka' : 'gambar'
  const pilihanNorm = ['angka','heads'].includes(pilih) ? 'heads' : 'tails'
  const menang = hasil === pilihanNorm
  const reward = menang ? bet : -bet
  const newKoin = Math.max(0, user.koin + reward)
  await updateUser(senderNumber, { koin: newKoin })
  await reply(
    `╔══════════════════════╗\n║  🪙 *COIN FLIP*      ║\n╚══════════════════════╝\n\n` +
    `🪙 Koin dilempar...\n\n` +
    `🎯 Hasil: *${hasil === 'heads' ? '🟡 HEADS (Angka)' : '⚪ TAILS (Gambar)'}*\n` +
    `👤 Pilihan: *${pilih}*\n\n` +
    `${menang ? `🎉 *MENANG! x2*\n💰 +${bet.toLocaleString('id-ID')} koin` : `😔 *KALAH!*\n💸 -${bet.toLocaleString('id-ID')} koin`}\n` +
    `💼 Saldo: *${newKoin.toLocaleString('id-ID')} koin*`
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   🐎 BALAPAN KUDA (Horse Race)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function kuda({ reply, senderNumber, text, user }) {
  const parts = (text || '').trim().split(/\s+/)
  const bet   = parseInt(parts[0])
  const pick  = parseInt(parts[1])
  if (!bet || bet < 100 || !pick || pick < 1 || pick > 4)
    return reply('❌ Format: *.kuda [bet] [1-4]*\nContoh: *.kuda 500 3*\n\n🐎 Pilih kuda 1-4 yang akan menang!\n_Bet minimum: 100 koin_')
  if (user.koin < bet) return reply(`❌ Koin tidak cukup! Kamu: *${user.koin.toLocaleString('id-ID')} koin*`)

  // Simulasi balapan
  const horses = [0, 0, 0, 0]
  const names  = ['🐎 Si Merah', '🐎 Si Biru', '🐎 Si Hijau', '🐎 Si Ungu']
  let steps    = []

  // 15 langkah balapan
  for (let i = 0; i < 15; i++) {
    horses[0] += randInt(1, 4)
    horses[1] += randInt(1, 4)
    horses[2] += randInt(1, 4)
    horses[3] += randInt(1, 4)
  }

  const winner    = horses.indexOf(Math.max(...horses)) + 1
  const positions = horses.map((h, i) => ({ horse: i+1, score: h })).sort((a,b) => b.score - a.score)
  const menang    = winner === pick
  const multiplier = 3
  const reward    = menang ? bet * (multiplier - 1) : -bet
  const newKoin   = Math.max(0, user.koin + reward)
  await updateUser(senderNumber, { koin: newKoin })

  let raceTrack = ''
  for (let i = 0; i < 4; i++) {
    const pos = positions.findIndex(p => p.horse === i+1) + 1
    const bar = '▬'.repeat(Math.floor(horses[i] / 5)) + '🏇'
    raceTrack += `${i+1}. ${bar.padEnd(20)} (${pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : '4️⃣'})\n`
  }

  await reply(
    `╔══════════════════════════╗\n║  🐎 *BALAPAN KUDA*       ║\n╚══════════════════════════╝\n\n` +
    `${raceTrack}\n` +
    `🏆 Pemenang: *Kuda #${winner}* (${names[winner-1]})\n` +
    `👤 Kamu pilih: *Kuda #${pick}*\n\n` +
    `${menang ? `🎉 *MENANG! x${multiplier}*\n💰 +${(bet*(multiplier-1)).toLocaleString('id-ID')} koin` : `😔 *KALAH!*\n💸 -${bet.toLocaleString('id-ID')} koin`}\n` +
    `💼 Saldo: *${newKoin.toLocaleString('id-ID')} koin*`
  )
}

// Re-export semua termasuk yang lama
const _prev = module.exports
module.exports = {
  ..._prev,
  dadu, blackjack, bjHit, bjStand, rolet, coinflip, kuda
}
