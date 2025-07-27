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
const fsPromises = require("fs/promises");
const { fetchEvents, flushEventsCache } = require("../services/eventService");  
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
const upload = multer({
  storage: multerStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
});
const mongoose = require("mongoose");


// Yeni etkinlik oluştur
router.post("/", verifyToken, upload.single("gorsel"), async (req, res) => {
  const allowedTypes = ["image/webp", "image/jpeg", "image/png"];
  if (req.file && !allowedTypes.includes(req.file.mimetype)) {
    return res.status(400).json({ message: "Geçersiz görsel formatı" });
  }
  try {
    const { baslik, sehir, tarih, fiyat, kategori, aciklama, tur, adres, gizli } = req.body;






    let gorselPath = req.file ? `/img/${req.file.filename}` : null;


    if (req.file) {
      const imagePath = path.join(__dirname, '../public/img', req.file.filename);
      


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
      gizli: gizli === "true" || gizli === true ? true : false,
    });

    const savedEtkinlik = await yeniEtkinlik.save();
        flushEventsCache();
    return res.status(201).json({ _id: yeniEtkinlik._id });
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
        flushEventsCache();
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
      { onaylandi: true, gizli: false },
      { new: true }
    );

    if (!etkinlik) {
      return res.status(404).json({ message: "Etkinlik bulunamadı" });
    }
        flushEventsCache();
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
        flushEventsCache();
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

    const query = { 
      onaylandi: true,
      $or: [{ gizli: false }, { gizli: { $exists: false } }]
    };

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
        const data = await fetchEvents(req.query);
    res.status(200).json(data);
  } catch (error) {
    console.error("Etkinlik çekme hatası:", error.message);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});



router.get("/favori-bildirim", verifyToken, async (req, res) => {
  const bugun = new Date().toISOString().split("T")[0]; // yyyy-mm-dd

  const favoriler = await Favori.find({ kullaniciId: req.user.id })
    .populate("etkinlikId")
    .lean();
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


router.get("/search", async (req, res) => {
  try {
    const query = req.query.q || "";

  const etkinlikler = await Etkinlik.find({
    onaylandi: true,
    $or: [{ gizli: false }, { gizli: { $exists: false } }],
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




router.get('/favorilerim', verifyToken, async (req, res) => {
  try {
    const bugun = new Date();           // ← BU 2 SATIRI EKLE
    bugun.setHours(0, 0, 0, 0);        // ← BU 2 SATIRI EKLE
    
    const favoriler = await Favori.find({ kullaniciId: req.user.id })
      .populate({
        path: "etkinlikId",
        match: {
          onaylandi: true,
          gizli: { $ne: true },
          tarih: { $gte: bugun } // ← new Date() yerine bugun yaz
        }
      })
      .lean();

    // Etkinlik silinmişse veya tarihi geçmişse populate null olur, onları filtrele:
    const etkinlikler = favoriler
      .map(f => f.etkinlikId)
      .filter(e => e); // null olmayanlar

    res.json(etkinlikler);
  } catch (error) {
    console.error('Favorilerim getirilemedi:', error);
    res.status(500).json({ message: 'Favorilerim alınırken hata oluştu' });
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
    const result = await Etkinlik.updateMany({}, { $set: { onaylandi: true,gizli: false } });
        flushEventsCache();
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
  
  // 👇 Bu satırı ekleyin
  await Etkinlik.findByIdAndUpdate(etkinlikId, { $inc: { favoriSayisi: 1 } });
  
  res.status(201).json({ message: "Favoriye eklendi" });
});

router.delete("/favori/:etkinlikId", verifyToken, async (req, res) => {
  const { etkinlikId } = req.params;
  const kullaniciId = req.user.id;

  // 👇 Silinen kaydı kontrol et
  const silinen = await Favori.findOneAndDelete({ etkinlikId, kullaniciId });
  
  // 👇 Bu kısmı ekleyin
  if (silinen) {
    await Etkinlik.findByIdAndUpdate(etkinlikId, { $inc: { favoriSayisi: -1 } });
  }
  
  res.json({ message: "Favoriden çıkarıldı" });
});

// Kullanıcının favori etkinliklerini döndür



module.exports = router;
