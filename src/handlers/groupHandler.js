const { getGroup } = require('../database/db')

async function groupHandler(sock, { id, participants, action }) {
  const group = await getGroup(id)
  if (!group.welcome) return

  let meta
  try { meta = await sock.groupMetadata(id) } catch { return }
  const nama = meta.subject || 'grup ini'

  for (const p of participants) {
    const num = p.replace('@s.whatsapp.net','')
    if (action === 'add') {
      await sock.sendMessage(id, {
        text: `╔══════════════════════════╗\n║   🌸 *MAIILOUVE BOT* 🌸   ║\n╚══════════════════════════╝\n\n👋 Selamat datang!\n@${num}\n\n📌 Grup: *${nama}*\n👥 Member: *${meta.participants.length}* orang\n\n_Ketik .menu untuk lihat fitur bot_ 🌸`,
        mentions: [p]
      })
    } else if (action === 'remove') {
      await sock.sendMessage(id, {
        text: `👋 Sampai jumpa @${num}!\n_${num} telah meninggalkan ${nama}_ 🌸`,
        mentions: [p]
      })
    }
  }
}

module.exports = groupHandler
