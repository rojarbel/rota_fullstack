// routes/upload.js  — Render friendly (memoryStorage + R2)
const express = require("express");
const multer  = require("multer");
const crypto  = require("crypto");
const sharp   = require("sharp");

const verifyToken = require("../middleware/verifyToken");
const { uploadToR2 } = require("../services/r2"); // sizin mevcut R2 servisi

const router = express.Router();

/** Multer: dosyayı RAM'de tut (Render FS read-only, /tmp dışında yazma) */
const uploadMem = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
  fileFilter: (req, file, cb) => {
    const ok = ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype);
    cb(ok ? null : new Error("Sadece jpeg, png, webp"), ok);
  },
});

/** file veya image alan adını kabul et */
function acceptFileOrImage(req, res, next) {
  uploadMem.single("file")(req, res, (err) => {
    if (err || !req.file) {
      return uploadMem.single("image")(req, res, next);
    }
    return next();
  });
}

router.post("/", verifyToken, acceptFileOrImage, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "file/image is required" });
    }

    const bufIn  = req.file.buffer;
    const mimeIn = req.file.mimetype || "application/octet-stream";

    // Varsayılan: JPEG'e dönüştür (R2’de tek tip saklama iyi olur)
    let outBuf, outMime = "image/jpeg", ext = "jpg";
    try {
      outBuf = await sharp(bufIn).rotate().jpeg({ quality: 80 }).toBuffer();
    } catch {
      // Çok bozuk dosya vs. — ham gönder
      outBuf  = bufIn;
      outMime = mimeIn;
      ext     = (mimeIn.split("/")[1] || "bin").toLowerCase();
    }

    const key = `events/${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}.${ext}`;

    // R2’ye yükle (mevcut servisiniz: uploadToR2(key, buffer, contentType))
    const url = await uploadToR2(key, outBuf, outMime);

    return res.status(201).json({ url, key });
  } catch (e) {
    console.error("UPLOAD ERROR:", e);
    return res.status(500).json({ error: "upload_failed", detail: String(e) });
  }
});

module.exports = router;
