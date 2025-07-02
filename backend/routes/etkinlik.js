// backend/routes/etkinlik.js


const multer = require("multer");
const verifyToken = require("../middleware/verifyToken");
const verifyAdmin = require("../middleware/verifyAdmin");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const express = require("express");
const router = express.Router();
const Etkinlik = require("../models/Etkinlik");
const Favori = require("../models/Favori");
const Kullanici = require("../models/Kullanici");
const Yorum = require("../models/Yorum");
const Bildirim = require("../models/Bildirim");
const { geocode } = require("../utils/geocodeCache");
function getOptimizedPath(originalPath) {
  return originalPath.replace(".webp", "_optimized.webp");
}



// Multer ayarı: bellek içine görsel yüklemesi
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../public/img"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + ".webp");
  },
});
const upload = multer({ storage: multerStorage });
const mongoose = require("mongoose");


// Yeni etkinlik oluştur
router.post("/", verifyToken, upload.single("gorsel"), async (req, res) => {
  const allowedTypes = ["image/webp", "image/jpeg", "image/png"];
  if (req.file && !allowedTypes.includes(req.file.mimetype)) {
    return res.status(400).json({ message: "Geçersiz görsel formatı" });
  }
  try {
    const { baslik, sehir, tarih, fiyat, kategori, aciklama, tur, adres } = req.body;

    let latitude = req.body.latitude ?? null;
    let longitude = req.body.longitude ?? null;

    if (!latitude || !longitude) {
      try {
        const coords = await geocode(adres || sehir);
        if (coords) {
          latitude = coords.lat;
          longitude = coords.lng;
        }
      } catch (err) {
        console.warn("📍 Konum bilgisi alınamadı:", err.message);
      }
    }

    let gorselPath = req.file ? `/img/${req.file.filename}` : null;


    if (req.file) {
      const imagePath = path.join(__dirname, '../public/img', req.file.filename);
      
      const fsPromises = require("fs/promises");

      try {
        await fs.access(imagePath); // dosya varsa devam et
        const optimizedPath = getOptimizedPath(imagePath);
        await sharp(imagePath)
          .resize({ width: 1024, withoutEnlargement: true })
          .webp({ quality: 75 })
          .toFile(optimizedPath);
        await fsPromises.unlink(imagePath); // async silme
        gorselPath = `/img/${path.basename(optimizedPath)}`; // başarıyla dönüştü
      } catch (err) {
        console.warn("⚠️ Görsel dosyası bulunamadı veya işlenemedi:", imagePath);
}
    }
    const yeniEtkinlik = new Etkinlik({
      baslik,
      sehir,
      tarih,
      fiyat,
      kategori,
      tur,
      aciklama,
      gorsel: gorselPath,
      onaylandi: false,
      adres, // Yeni etkinlikler başlangıçta onaysız olur
      latitude,
      longitude,
    });

    const savedEtkinlik = await yeniEtkinlik.save();
    
    res.status(201).json(savedEtkinlik);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Etkinlik oluşturulurken hata oluştu", error: error.message });
  }
});

// Bekleyen (onaysız) etkinlikleri getir
router.get("/bekleyen", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const bekleyenler = await Etkinlik.find({ onaylandi: false }).lean();
    const bekleyenlerWithId = bekleyenler.map(e => ({
      id: e._id.toString(),
      baslik: e.baslik,
      sehir: e.sehir,
      tarih: e.tarih,
      fiyat: e.fiyat,
      kategori: e.kategori,
      tur: e.tur,
      gorsel:
  typeof e.gorsel === "string" && e.gorsel.startsWith("data:image")
    ? null
    : e.gorsel,

      aciklama: e.aciklama,
      onaylandi: e.onaylandi
    }));
    res.json(bekleyenlerWithId);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Bekleyen etkinlikler alınamadı" });
  }
});
// Tüm etkinlikleri sil
router.delete("/hepsiniSil", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const result = await Etkinlik.deleteMany({});
    res.json({ message: "Tüm etkinlikler silindi", deletedCount: result.deletedCount });
  } catch (err) {
    console.error("[HATA] Etkinlik silinirken:", err);
    res.status(500).json({ message: "Etkinlik silinirken hata oluştu", details: err.message });
  }
});

// Etkinlik onayla
router.put("/onayla/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const etkinlik = await Etkinlik.findByIdAndUpdate(
      req.params.id,
      { onaylandi: true },
      { new: true }
    );

    if (!etkinlik) {
      return res.status(404).json({ message: "Etkinlik bulunamadı" });
    }

    res.json({
      id: etkinlik._id.toString(),
      baslik: etkinlik.baslik,
      sehir: etkinlik.sehir,
      tarih: etkinlik.tarih,
      fiyat: etkinlik.fiyat,
      kategori: etkinlik.kategori,
      tur: etkinlik.tur,
      gorsel: etkinlik.gorsel,
      aciklama: etkinlik.aciklama,
      onaylandi: etkinlik.onaylandi
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Etkinlik onaylanamadı" });
  }
});

// Etkinlik sil
router.delete("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const deletedEtkinlik = await Etkinlik.findByIdAndDelete(req.params.id);

    if (!deletedEtkinlik) {
      return res.status(404).json({ message: "Etkinlik bulunamadı" });
    }

    res.json({ message: "Etkinlik başarıyla silindi" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Etkinlik silinirken hata oluştu" });
  }
});

// Tüm onaylı etkinlikleri getir (Kategori filtresi destekli)

// Tüm onaylı etkinlikleri getir (şehir ve kategori filtresi destekli)
router.get("/", async (req, res) => {
  try {
    const { kategori, sehir } = req.query;

    const query = { onaylandi: true };

    if (sehir) {
      query.sehir = new RegExp(`^${sehir}$`, 'i');
    }

    if (kategori) {
      query.kategori = new RegExp(`^${kategori}$`, 'i');
    }

    const etkinlikler = await Etkinlik.find(query)
      .select(
        "_id baslik sehir tarih fiyat kategori tur gorsel aciklama onaylandi latitude longitude"
      )
      .limit(36)
      .lean();

    const etkinliklerWithId = etkinlikler.map(e => ({
      id: e._id.toString(),
      baslik: e.baslik,
      sehir: e.sehir,
      tarih: e.tarih,
      fiyat: e.fiyat,
      kategori: e.kategori,
      tur: e.tur,
      gorsel: typeof e.gorsel === "string" && e.gorsel.startsWith("data:image") ? null : e.gorsel,
      aciklama: e.aciklama,
      onaylandi: e.onaylandi,
      latitude: e.latitude,
      longitude: e.longitude
    }));

    res.json(etkinliklerWithId);
  } catch (error) {
    res.status(500).json({ message: "Etkinlikler alınamadı" });
  }
});


// /routes/etkinlik.js içinde


router.get("/tum", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      kategori,
      sehir,
      tur,
      fiyatMin,
      fiyatMax,
      baslangic,
      bitis,
      filter,
    } = req.query;

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const nowTimestamp = now.getTime(); // ← Burası kritik

    const match = {
      onaylandi: true,
      tarihDate: { $gte: now }
    };


    if (kategori) match.kategori = new RegExp(`^${kategori.trim()}$`, "i");
    if (sehir) match.sehir = new RegExp(`^${sehir.trim()}$`, "i");
    if (tur) {
      const turler = Array.isArray(tur) ? tur : [tur];
      if (turler.length > 0) {
        match.tur = { $in: turler.map(t => new RegExp(`^${t}$`, "i")) };
      }
    }

        const pipeline = [
      { $match: match },
    ];
    pipeline.unshift({
  $addFields: {
    tarihDate: {
      $cond: [
        { $eq: [{ $type: "$tarih" }, "date"] },
        "$tarih",
        { $toDate: "$tarih" }
      ]
    }
  }
});


if (filter?.toLowerCase() === "ucretsiz") {
  pipeline.push({
    $match: {
      fiyat: {
        $in: [
          "", " ", null, undefined,
          0, "0", 0.0, "0.00",
          "Ücretsiz", "ücretsiz", "ÜCRETSİZ", "ücretsiz ", "Ücretsiz ",
          "free", "FREE"
        ]
      }
    }
  });
}
else if (filter?.toLowerCase() === "yaklasan") {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  pipeline.push({

    
    $addFields: {
      tarihDate: {
        $cond: [
          { $eq: [{ $type: "$tarih" }, "date"] },
          "$tarih",
          { $toDate: "$tarih" }
        ]
      }
    }
  });

  pipeline.push({
    $match: {
      tarihDate: { $gte: today }
    }
  });
}
if (filter?.toLowerCase() === "populer") {
  pipeline.push({
    $addFields: {
      populerSkor: {
        $add: [
          { $ifNull: ["$tiklanmaSayisi", 0] },
          { $multiply: [{ $ifNull: ["$favoriSayisi", 0] }, 2] }
        ]
      }
    }
  });
  pipeline.push({ $sort: { populerSkor: -1 } });
  console.log("💡 Query pipeline:", JSON.stringify(pipeline, null, 2));

}

    const defaultMin = 0;
    const defaultMax = 22104;

const isFiyatFilterActive =
  filter?.toLowerCase() !== "ucretsiz" &&
  ((fiyatMin && parseFloat(fiyatMin) > defaultMin) ||
  (fiyatMax && parseFloat(fiyatMax) < defaultMax));

if (isFiyatFilterActive) {
  pipeline.push({
    $addFields: {
      fiyatTemiz: {
        $ifNull: [
          {
            $regexFind: {
              input: "$fiyat",
              regex: /\d+(\.\d+)?/
            }
          },
          { match: null }
        ]
      }
    }
  });

  pipeline.push({
    $addFields: {
      fiyatSayisal: { $toDouble: "$fiyatTemiz.match" }
    }
  });

  const fiyatExpr = { $and: [] };
  if (fiyatMin) fiyatExpr.$and.push({ $gte: ["$fiyatSayisal", parseFloat(fiyatMin)] });
  if (fiyatMax) fiyatExpr.$and.push({ $lte: ["$fiyatSayisal", parseFloat(fiyatMax)] });

  pipeline.push({ $match: { $expr: fiyatExpr } });
}




if (baslangic) {
  pipeline.push({
    $addFields: {
      tarihDate: {
        $cond: [
          { $eq: [{ $type: "$tarih" }, "date"] },
          "$tarih",
          { $toDate: "$tarih" }
        ]
      }
    }
  });
  pipeline.push({
    $match: {
      tarihDate: { $gte: new Date(baslangic) }
    }
  });
}


if (bitis) {
  pipeline.push({
    $addFields: {
      tarihDate: {
        $cond: [
          { $eq: [{ $type: "$tarih" }, "date"] },
          "$tarih",
          { $toDate: "$tarih" }
        ]
      }
    }
  });
  pipeline.push({
    $match: {
      tarihDate: { $lte: new Date(bitis + 'T23:59:59.999Z') }
    }
  });
}

    const skip = (parseInt(page) - 1) * parseInt(limit);
    pipeline.push({ $sort: { tarih: 1 } });
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: parseInt(limit) });

    const etkinlikler = await Etkinlik.aggregate(pipeline);
    const hasMore = etkinlikler.length === parseInt(limit);
    const totalCount = await Etkinlik.countDocuments(match);
res.status(200).json({
  data: etkinlikler.map(e => ({
    ...e,
    _id: e._id?.toString?.() ?? e.id,
  })),
  hasMore,
  totalCount
});
  } catch (error) {
    console.error("Etkinlik çekme hatası:", error.message);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});



router.get("/favori-bildirim", verifyToken, async (req, res) => {
  const bugun = new Date().toISOString().split("T")[0]; // yyyy-mm-dd

  const favoriler = await Favori.find({ kullaniciId: req.user.id }).populate("etkinlikId");
const bugunkuler = favoriler.filter(f => {
  if (!f.etkinlikId?.tarih) return false;
  const etkinlikTarihi = new Date(f.etkinlikId.tarih).toISOString().split("T")[0];
  return etkinlikTarihi === bugun;
});

  for (const f of bugunkuler) {
    const varsa = await Bildirim.findOne({
      kullaniciId: req.user.id,
      tip: "favori",
      etkinlikId: f.etkinlikId._id,
    });

    if (!varsa) {
      await new Bildirim({
        kullaniciId: req.user.id,
        tip: "favori",
        etkinlikId: f.etkinlikId._id,
        mesaj: "Favorilere eklediğiniz etkinlik bugün!",
      }).save();
    }
  }

  res.json({ mesaj: "Bildirimler kontrol edildi", sayi: bugunkuler.length });
});


// Etkinlik arama (başlık, kategori veya şehir bazlı)
router.get('/yakindaki', async (req, res) => {
  try {
    const { lat, lng, lon, radius = 50000 } = req.query; // radius artık metre cinsinden
    
    // lat/lng veya lat/lon parametrelerini destekle
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng || lon);
    const radiusMeters = parseInt(radius);

    // Parametre kontrolü
    if (isNaN(userLat) || isNaN(userLng)) {
      return res.status(400).json({ 
        message: 'Geçersiz konum parametreleri',
        error: 'lat ve lng/lon parametreleri gerekli ve sayısal olmalı'
      });
    }

    if (isNaN(radiusMeters) || radiusMeters <= 0) {
      return res.status(400).json({ 
        message: 'Geçersiz yarıçap',
        error: 'radius parametresi pozitif bir sayı olmalı (metre cinsinden)'
      });
    }

    // Maksimum yarıçap sınırı (performans için)
    const maxRadiusMeters = 200000; // 200km
    const finalRadius = Math.min(radiusMeters, maxRadiusMeters);

    console.log(`🔍 Yakın etkinlik arama: lat=${userLat}, lng=${userLng}, radius=${finalRadius}m`);

    // MongoDB'de koordinatları olan onaylı etkinlikleri getir
    const etkinlikler = await Etkinlik.find({ 
      onaylandi: true,
      latitude: { $exists: true, $ne: null },
      longitude: { $exists: true, $ne: null }
    })
    .select('_id baslik sehir tarih fiyat kategori tur gorsel aciklama latitude longitude adres')
    .lean();

    console.log(`📍 ${etkinlikler.length} koordinatlı etkinlik bulundu`);

    const yakinEtkinlikler = [];

    for (const etkinlik of etkinlikler) {
      const etkinlikLat = parseFloat(etkinlik.latitude);
      const etkinlikLng = parseFloat(etkinlik.longitude);

      // Koordinat doğrulaması
      if (isNaN(etkinlikLat) || isNaN(etkinlikLng)) {
        console.warn(`⚠️ Geçersiz koordinat: ${etkinlik.baslik}`);
        continue;
      }

      // Mesafe hesapla
      const distance = haversine(userLat, userLng, etkinlikLat, etkinlikLng);
      const distanceMeters = distance * 1000; // km'yi metreye çevir

      if (distanceMeters <= finalRadius) {
        yakinEtkinlikler.push({
          id: etkinlik._id.toString(),
          baslik: etkinlik.baslik,
          sehir: etkinlik.sehir,
          tarih: etkinlik.tarih,
          fiyat: etkinlik.fiyat,
          kategori: etkinlik.kategori,
          tur: etkinlik.tur,
          gorsel: typeof etkinlik.gorsel === "string" && etkinlik.gorsel.startsWith("data:image") 
            ? null 
            : etkinlik.gorsel,
          aciklama: etkinlik.aciklama,
          latitude: etkinlikLat,
          longitude: etkinlikLng,
          mesafe: Math.round(distance * 100) / 100, // km cinsinden, 2 ondalık
          adres: etkinlik.adres
        });
      }
    }

    // Mesafeye göre sırala (yakından uzağa)
    yakinEtkinlikler.sort((a, b) => a.mesafe - b.mesafe);

    console.log(`✅ ${yakinEtkinlikler.length} yakın etkinlik bulundu (${finalRadius/1000}km içinde)`);

    res.json({
      etkinlikler: yakinEtkinlikler,
      toplam: yakinEtkinlikler.length,
      arama: {
        latitude: userLat,
        longitude: userLng,
        yarıcap: finalRadius,
        yarıcapKm: finalRadius / 1000
      }
    });

  } catch (error) {
    console.error('❌ Yakındaki etkinlikler hatası:', error);
    res.status(500).json({ 
      message: 'Yakındaki etkinlikler alınırken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Sunucu hatası'
    });
  }
});

router.get("/search", async (req, res) => {
  try {
    const query = req.query.q || "";

    const etkinlikler = await Etkinlik.find({
      onaylandi: true,
      $or: [
        { baslik: { $regex: query, $options: "i" } },
        { kategori: { $regex: query, $options: "i" } },
        { sehir: { $regex: query, $options: "i" } },
      ],
    })
      .select("_id baslik sehir tarih fiyat kategori tur gorsel aciklama onaylandi")
      .limit(36)
      .lean(); 

    const sonuc = etkinlikler.map(e => ({
      id: e._id.toString(), // 🔥 frontend için garanti
      baslik: e.baslik,
      sehir: e.sehir,
      tarih: e.tarih,
      fiyat: e.fiyat,
      kategori: e.kategori,
      tur: e.tur,
      gorsel:
  typeof e.gorsel === "string" && e.gorsel.startsWith("data:image")
    ? null
    : e.gorsel,

      aciklama: e.aciklama,
      onaylandi: e.onaylandi
    }));

    res.json(sonuc);
  } catch (error) {
    res.status(500).json({ message: "Etkinlik araması sırasında hata oluştu" });
  }
});






// Tekil etkinlik getir
router.get("/:id", async (req, res) => {
  const id = req.params.id;

  try {
    let etkinlik = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      etkinlik = await Etkinlik.findByIdAndUpdate(
        id,
        { $inc: { tiklanmaSayisi: 1 } },
        { new: true }
      ).lean();
    } else {
      etkinlik = await Etkinlik.findOneAndUpdate(
        { id },
        { $inc: { tiklanmaSayisi: 1 } },
        { new: true }
      ).lean();
    }

    if (!etkinlik) {
      return res.status(404).json({ message: "Etkinlik bulunamadı" });
    }

    etkinlik.id = etkinlik._id?.toString?.() || etkinlik.id;
    delete etkinlik._id;

    if (typeof etkinlik.gorsel === "string" && etkinlik.gorsel.startsWith("data:image")) {
      etkinlik.gorsel = "";
    }

    res.json(etkinlik);
  } catch (error) {
    console.error("[ETKINLIK GET HATA]:", error.message);
    res.status(500).json({ message: "Etkinlik alınamadı", error: error.message });
  }
});



// Tüm etkinlikleri onayla (admin route gibi düşünebilirsin)
router.put("/onaylaHepsini", async (req, res) => {
  try {
    const result = await Etkinlik.updateMany({}, { $set: { onaylandi: true } });
    res.json({ message: "Tüm etkinlikler onaylandı", modifiedCount: result.modifiedCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Güncelleme hatası" });
  }
});

 // En üste ekle

router.get('/:id/favorileyenler', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Favorileri ve kullanıcı bilgilerini çek
    const favoriler = await Favori.find({ etkinlikId: id })
      .populate('kullaniciId')
      .lean();

        const users = favoriler
          .filter(f => f.kullaniciId)
    .map(f => {
      const k = f.kullaniciId;
      const ad = k.adSoyad || k.username || 'Kullanıcı';

      const rawAvatar = k.avatar || k.avatarUrl || k.image || "";
      const avatarUrl = rawAvatar && rawAvatar.trim() !== ""
        ? rawAvatar
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(ad)}`;

      return {
        id: k._id,
        kullanici: ad,
        avatarUrl,
      };
    });

    res.json({ 
      users, 
      toplam: users.length 
    });
      
  } catch (error) {
    console.error('Favorileyenler getirilirken hata:', error);
    res.status(500).json({ message: 'Favorileyenler getirilemedi' });
  }
});

router.post("/favori", verifyToken, async (req, res) => {
  const { etkinlikId } = req.body;
  const kullaniciId = req.user.id;

  const mevcut = await Favori.findOne({ etkinlikId, kullaniciId });
  if (mevcut) return res.status(409).json({ message: "Zaten favoride" });

  await new Favori({ etkinlikId, kullaniciId }).save();
  res.status(201).json({ message: "Favoriye eklendi" });
});

router.delete("/favori/:etkinlikId", verifyToken, async (req, res) => {
  const { etkinlikId } = req.params;
  const kullaniciId = req.user.id;

  await Favori.findOneAndDelete({ etkinlikId, kullaniciId });
  res.json({ message: "Favoriden çıkarıldı" });
});



function haversine(lat1, lon1, lat2, lon2) {
  const toRad = deg => (deg * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

module.exports = router;
