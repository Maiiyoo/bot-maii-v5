# 🌸 Maiilouve Bot v4

WhatsApp Bot lengkap berbasis [@whiskeysockets/baileys](https://github.com/whiskeysockets/baileys).

---

## ⚡ Cara Install (Termux / VPS)

```bash
# 1. Install Node.js (jika belum)
pkg install nodejs-lts   # di Termux
# atau
apt install nodejs npm   # di Ubuntu/Debian VPS

# 2. Masuk ke folder bot
cd bot-maii-v4

# 3. Jalankan installer otomatis
bash install.sh

# 4. Edit file .env — isi OWNER_NUMBER kamu
nano .env

# 5. Jalankan bot
node src/index.js
```

---

## 📋 Konfigurasi .env

```
BOT_NAME=Maiilouve
OWNER_NUMBER=628xxxxxxxxxx   ← isi nomor HP kamu (format 62xxx)

GROQ_API_KEY=...
OPENWEATHER_API_KEY=...
OCR_API_KEY=...
IPINFO_TOKEN=...
NEWS_API_KEY=...
RAPIDAPI_KEY=...

DAILY_KOIN=500
TAMBANG_COOLDOWN=180000
STEAL_SUCCESS_RATE=40
STEAL_PERCENT=10
TIMEZONE=Asia/Jakarta
```

---

## 🎮 Fitur

| Kategori | Commands |
|---|---|
| 💰 Ekonomi | .saldo .daily .tambang .ternak .toko .beli .jual .transfer .curi .lb |
| 🏦 Bank | .bank .portfolio .beli gold/diamond .jual gold/diamond |
| 🎮 Game | .trivia .tebak .tts .matematik .rps .suit .gacha .slot .spin .tebakangka .hangman |
| 🕵️ Spy | .spy .spyjoin .clue |
| 📰 Info | .cuaca .gempa .berita .sholat .kurs .arti .translate .ocr .ip .lirik .calc .qr |
| 📥 Download | .yt .ytmp4 .tt |
| 🖼️ Stiker | .s .st .toimg .imagine |
| 🤖 AI | .tanya .resetai + DM/mention bot |
| 🛡️ Admin | .kick .promote .demote .lock .unlock .tagall .warn .setwelcome .antilink |

---

## 🌸 Credit

- Library: [@whiskeysockets/baileys](https://github.com/whiskeysockets/baileys)
- AI: Groq (llama-3.3-70b-versatile)
- Creator: Mayyy 👑
