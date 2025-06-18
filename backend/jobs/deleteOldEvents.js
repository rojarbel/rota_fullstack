const cron = require("node-cron");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const Etkinlik = require("../models/Etkinlik");
require("dotenv").config();



async function silGecmisEtkinlikler() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filter = { $expr: { $lt: [ { $toDate: "$tarih" }, today ] } };

    const silinecekler = await Etkinlik.find(filter);

    for (const etkinlik of silinecekler) {
      if (etkinlik.gorsel) {
        const sanitizedFilename = etkinlik.gorsel.replace(/^\/img\//, "");
        const gorselPath = path.join(__dirname, '../public/img', sanitizedFilename);
        if (fs.existsSync(gorselPath)) {
          try {
            fs.unlinkSync(gorselPath);
            console.log(`[DOSYA SİLİNDİ] ${etkinlik.gorsel}`);
          } catch (err) {
            console.error(`[HATA] Görsel silinemedi: ${etkinlik.gorsel} → ${err.message}`);
          }
        }
      }
    }

    const result = await Etkinlik.deleteMany(filter);
    console.log(`[ETKİNLİK TEMİZLEME] ${result.deletedCount} etkinlik silindi (tarih < ${today.toISOString().split("T")[0]}).`);

  } catch (error) {
    console.error("[HATA] Silme sırasında:", error.message);
  }
}

// Cron: her gece 00:01
function scheduleDeleteOldEvents() {
  // Cron: her gece 00:01
  cron.schedule("1 0 * * *", silGecmisEtkinlikler);
}

module.exports = {
  silGecmisEtkinlikler,
  scheduleDeleteOldEvents
};

// Komutla çalıştırmak için:
if (require.main === module) {
  mongoose
    .connect(process.env.MONGO_URL)
    .then(() => silGecmisEtkinlikler())
    .then(() => {
      console.log("✅ Manuel silme tamamlandı");
    })
    .finally(() => {
      mongoose.disconnect();
      process.exit();
    });
}
