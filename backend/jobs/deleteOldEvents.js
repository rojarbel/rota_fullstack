// deleteOldEvents.js
const cron = require("node-cron");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const Etkinlik = require("../models/Etkinlik");
const Yorum = require("../models/Yorum");
const Favori = require("../models/Favori");
const Bildirim = require("../models/Bildirim");
require("dotenv").config();

async function silGecmisEtkinlikler() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filter = { $expr: { $lt: [{ $toDate: "$tarih" }, today] } };
    const silinecekler = await Etkinlik.find(filter);
    const unlink = fs.promises.unlink;

    const etkinlikIdListesi = silinecekler.map((e) => e._id);

    await Promise.all(
      silinecekler.map(async (etkinlik) => {
        if (etkinlik.gorsel) {
          const sanitizedFilename = etkinlik.gorsel.replace(/^\/img\//, "");
          const gorselPath = path.join(__dirname, "../public/img", sanitizedFilename);
          try {
            await unlink(gorselPath);
            console.log(`[DOSYA S\u0130L\u0130ND\u0130] ${etkinlik.gorsel}`);
          } catch (err) {
            if (err.code !== "ENOENT") {
              console.error(`[HATA] Görsel silinemedi: ${etkinlik.gorsel} → ${err.message}`);
            }
          }
        }
      })
    );

    const silEtkinlik = await Etkinlik.deleteMany({ _id: { $in: etkinlikIdListesi } });
    const silYorum = await Yorum.deleteMany({ etkinlikId: { $in: etkinlikIdListesi } });
    const silFavori = await Favori.deleteMany({ etkinlikId: { $in: etkinlikIdListesi } });
    const silBildirim = await Bildirim.deleteMany({ etkinlikId: { $in: etkinlikIdListesi } });

    console.log(`[TEM\u0130ZLEND\u0130] ${silEtkinlik.deletedCount} etkinlik, ${silYorum.deletedCount} yorum, ${silFavori.deletedCount} favori, ${silBildirim.deletedCount} bildirim silindi.`);

  } catch (error) {
    console.error("[HATA] Silme sırasında:", error.message);
  }
}

function scheduleDeleteOldEvents() {
  cron.schedule("1 0 * * *", silGecmisEtkinlikler); // her gece 00:01
}

module.exports = {
  silGecmisEtkinlikler,
  scheduleDeleteOldEvents,
};

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
