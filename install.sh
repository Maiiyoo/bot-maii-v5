#!/bin/bash
# ╔══════════════════════════════════════════════╗
# ║   🌸  MAIILOUVE BOT v4 — INSTALL SCRIPT  🌸  ║
# ╚══════════════════════════════════════════════╝

PINK='\033[38;5;213m'
GREEN='\033[92m'
RED='\033[91m'
YELLOW='\033[93m'
BOLD='\033[1m'
RESET='\033[0m'

echo ""
echo -e "${PINK}${BOLD}  ╔══════════════════════════════════════════════╗"
echo    "  ║   🌸  MAIILOUVE BOT v4 — INSTALLER  🌸      ║"
echo -e "  ╚══════════════════════════════════════════════╝${RESET}"
echo ""

# Cek Node.js
echo -e "${YELLOW}[1/5]${RESET} Mengecek Node.js..."
if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js tidak ditemukan!${RESET}"
  echo -e "${YELLOW}Install Node.js dulu:${RESET}"
  echo "   pkg install nodejs"
  echo "   atau: pkg install nodejs-lts"
  exit 1
fi
NODE_VER=$(node -v)
echo -e "${GREEN}✅ Node.js $NODE_VER ditemukan${RESET}"

# Cek npm
echo -e "${YELLOW}[2/5]${RESET} Mengecek npm..."
if ! command -v npm &> /dev/null; then
  echo -e "${RED}❌ npm tidak ditemukan! Install: pkg install npm${RESET}"
  exit 1
fi
echo -e "${GREEN}✅ npm $(npm -v) ditemukan${RESET}"

# Buat folder
echo -e "${YELLOW}[3/5]${RESET} Membuat folder yang diperlukan..."
mkdir -p sessions data assets
echo -e "${GREEN}✅ Folder sessions/ data/ assets/ siap${RESET}"

# Install dependencies
echo -e "${YELLOW}[4/5]${RESET} Menginstall dependencies..."
echo -e "${PINK}   (Ini bisa makan waktu 2-5 menit, sabar ya!)${RESET}"
npm install --legacy-peer-deps 2>&1 | tail -5
if [ $? -ne 0 ]; then
  echo -e "${YELLOW}⚠️  Ada warning, coba install ulang...${RESET}"
  npm install --legacy-peer-deps --force 2>&1 | tail -3
fi
echo -e "${GREEN}✅ Dependencies terinstall!${RESET}"

# Cek .env
echo -e "${YELLOW}[5/5]${RESET} Mengecek konfigurasi .env..."
if [ ! -f ".env" ]; then
  echo -e "${RED}❌ File .env tidak ditemukan!${RESET}"
  echo -e "${YELLOW}Buat file .env dulu — lihat contoh di README.md${RESET}"
  exit 1
fi

# Cek OWNER_NUMBER
if grep -q "OWNER_NUMBER=$" .env; then
  echo -e "${YELLOW}⚠️  OWNER_NUMBER kosong di .env — isi dulu nomor HP kamu!${RESET}"
fi

echo ""
echo -e "${PINK}${BOLD}  ╔══════════════════════════════════════════════╗"
echo    "  ║   ✅  INSTALASI SELESAI!                     ║"
echo    "  ║   Jalankan bot dengan:  node src/index.js    ║"
echo -e "  ╚══════════════════════════════════════════════╝${RESET}"
echo ""
