// routes/bildirim.js
const express = require("express");
const router = express.Router();
const Bildirim = require("../models/Bildirim");
const verifyToken = require("../middleware/verifyToken");

// 👤 Giriş yapan kullanıcının okunmamış bildirimlerini getir
router.get("/", verifyToken, async (req, res) => {
  try {
    const bildirimler = await Bildirim.find({
      kullaniciId: req.user.id,
    })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate("etkinlikId", "baslik gorsel sehir tarih") // daha fazla alan olsun // 🔥 kritik satır
    .lean();
    res.json(bildirimler);
  } catch (err) {
    res.status(500).json({ error: "Bildirimler alınamadı" });
  }
});

// 🔴 Bildirimleri okundu olarak işaretle
router.put("/okundu", verifyToken, async (req, res) => {
  try {
    await Bildirim.updateMany({ kullaniciId: req.user.id, okunduMu: false }, { okunduMu: true });
    res.json({ message: "Bildirimler okundu olarak işaretlendi" });
  } catch (err) {
    res.status(500).json({ error: "Bildirim güncellenemedi" });
  }
});

// 📩 Yeni bildirim oluşturma (internal kullanım)
router.post("/", verifyToken, async (req, res) => {
  try {
    const { kullaniciId, tip, etkinlikId, yorumId, mesaj } = req.body;

    if (!kullaniciId || !tip || !mesaj) {
      return res.status(400).json({ error: "Eksik bilgi" });
    }

    const yeni = new Bildirim({ kullaniciId, tip, etkinlikId, yorumId, mesaj });
    await yeni.save();
    res.status(201).json(yeni);
  } catch (err) {
    res.status(500).json({ error: "Bildirim oluşturulamadı" });
  }
});

module.exports = router;