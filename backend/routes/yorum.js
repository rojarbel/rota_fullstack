// routes/yorum.js
const express = require("express");
const router = express.Router();
const Yorum = require("../models/Yorum");
const verifyToken = require("../middleware/verifyToken");
const Bildirim = require("../models/Bildirim");


// GET: Etkinliğe ait tüm yorumlar (alt yorumlarla birlikte)
router.get("/:etkinlikId", verifyToken, async (req, res) => {
  try {
    const yorumlar = await Yorum.find({ etkinlikId: req.params.etkinlikId })
      .sort({ begeni: -1, tarih: -1 })
      .lean();

    const userId = req.user.id;

    const enriched = yorumlar.map(y => ({
      _id: y._id,
      yorum: y.yorum,
      tarih: y.tarih,
      begeni: y.begeni,
      begenenler: y.begenenler,
      ustYorumId: y.ustYorumId,
      kullanici: y.kullanici,
      kullaniciId: y.kullaniciId,
      avatarUrl: (y.avatarUrl && y.avatarUrl.trim() !== "") 
        ? y.avatarUrl 
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(y.kullanici)}`,
      begendinMi: y.begenenler?.some(uid => uid.toString() === userId) || false
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: "Yorumlar alınamadı" });
  }
});

router.get("/tek/:id", verifyToken, async (req, res) => {
  try {
    const yorum = await Yorum.findById(req.params.id).lean();
    if (!yorum) return res.status(404).json({ error: "Yorum bulunamadı" });
    res.json(yorum);
  } catch (err) {
    res.status(500).json({ error: "Yorum alınamadı" });
  }
});

// POST: Yorum veya alt yorum ekle
router.post("/", verifyToken, async (req, res) => {
  try {
const { yorum, etkinlikId, yanitId = null, avatarUrl = "" } = req.body;
    const ustYorumId = yanitId;

    const yeniYorum = new Yorum({
      yorum,
      etkinlikId,
      ustYorumId,
      kullaniciId: req.user.id,
      kullanici: req.user.username || "Anonim",
      avatarUrl: avatarUrl?.trim() || req.user.avatar || ""
   });

    const saved = await yeniYorum.save();
        if (ustYorumId) {
      const ustYorum = await Yorum.findById(ustYorumId);
      if (ustYorum && ustYorum.kullaniciId.toString() !== req.user.id) {
      await new Bildirim({
        kullaniciId: ustYorum.kullaniciId,
        tip: "yanit",
        yorumId: ustYorum._id,
        etkinlikId: etkinlikId, // 🔥 eklendi
        mesaj: "Yorumuna bir yanıt geldi.",
      }).save();
      }
    }
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: "Yorum gönderilemedi" });
  }
});

// PUT: Beğeni arttır
router.put("/begen/:id", verifyToken, async (req, res) => {
  try {
    const yorum = await Yorum.findById(req.params.id);
    if (!yorum) return res.status(404).json({ error: "Yorum bulunamadı" });

    const userId = req.user.id;
const alreadyLiked = yorum.begenenler.some(id => id.toString() === userId);

    if (alreadyLiked) {
      yorum.begeni--;
      yorum.begenenler = yorum.begenenler.filter(id => id.toString() !== userId);
    } else {
      yorum.begeni++;
      yorum.begenenler.push(userId);
    }

    await yorum.save();
    res.json({ ...yorum.toObject(), begendinMi: !alreadyLiked });
  } catch (err) {
    res.status(500).json({ error: "Beğeni işlemi başarısız" });
  }
});
// PUT: Yorumu düzenle
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const yorum = await Yorum.findById(req.params.id);
    if (!yorum) return res.status(404).json({ error: "Yorum bulunamadı" });
    if (yorum.kullaniciId.toString() !== req.user.id && req.user.role !== 'admin') {
  return res.status(403).json({ error: "Yetkisiz" });
}

    yorum.yorum = req.body.yorum;
    await yorum.save();
    res.json(yorum);
  } catch (err) {
    res.status(500).json({ error: "Yorum güncellenemedi" });
  }
});

// DELETE: Yorumu sil

const deleteYorumVeAltlarini = async (yorumId) => {
  const altYorumlar = await Yorum.find({ ustYorumId: yorumId });
  for (const alt of altYorumlar) {
    await deleteYorumVeAltlarini(alt._id);
  }
  await Yorum.findByIdAndDelete(yorumId);
};

router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const yorum = await Yorum.findById(req.params.id);
    if (!yorum) return res.status(404).json({ error: "Yorum bulunamadı" });

    if (yorum.kullaniciId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: "Yetkisiz" });
    }

    await deleteYorumVeAltlarini(yorum._id);

    res.json({ message: "Yorum ve alt yanıtlar silindi" });
  } catch (err) {
    res.status(500).json({ error: "Silme başarısız" });
  }
});


module.exports = router;
