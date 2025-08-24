const express = require('express');
const multer = require('multer');
const path = require('path');
const { Worker } = require('worker_threads');
const fs = require('fs/promises');
const fsSync = require('fs'); // klasör var mı kontrolü
const crypto = require('crypto');

const verifyToken = require("../middleware/verifyToken");
const verifyAdmin = require("../middleware/verifyAdmin");
const { uploadToR2 } = require('../services/r2'); // R2 upload servisi

const router = express.Router();

/** IMG klasörünü garantiye al (Render'da ilk çalışmada yoksa oluştur) */
const imgDir = path.resolve(path.join(__dirname, '../public/img'));
if (!fsSync.existsSync(imgDir)) {
  fsSync.mkdirSync(imgDir, { recursive: true });
}

/** Multer ayarı: önce diske (geçici) yazıyoruz, sonra worker işler; en sonda R2'ye atıp local dosyayı siliyoruz */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, imgDir), // sabit imgDir
  filename: (req, file, cb) => {
    const ext = path.extname(path.basename(file.originalname));
    const uniqueSuffix = crypto.randomUUID();
    cb(null, `${Date.now()}_${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Sadece jpeg, png ve webp yüklenebilir.'));
  }
});

/** Yükleme endpoint'i */
router.post('/', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Dosya bulunamadı' });

    // Güvenli dosya adı + tam yol
    const sanitizedFilename = path.basename(req.file.filename);
    let originalPath = path.resolve(path.join(imgDir, sanitizedFilename));
    if (!originalPath.startsWith(imgDir)) throw new Error('Invalid file path');

    // Görseli worker ile işle (imageWorker.js mevcut akışın)
    const worker = new Worker(path.join(__dirname, '../jobs/imageWorker.js'));
    const result = await new Promise((resolve, reject) => {
      worker.once('message', resolve);
      worker.once('error', reject);
      worker.postMessage({ filePath: originalPath });
    });

    if (!result.success) {
      await fs.unlink(originalPath).catch(() => {});
      return res.status(500).json({ message: 'Görsel işleme başarısız', error: result.error });
    }

    // Eğer .jpg değilse .jpg'e çevir (rename)
    const parsed = path.parse(originalPath);
    let finalPath = originalPath;
    if (parsed.ext.toLowerCase() !== '.jpg' && parsed.ext.toLowerCase() !== '.jpeg') {
      finalPath = path.format({ dir: parsed.dir, name: parsed.name, ext: '.jpg' });
      await fs.rename(originalPath, finalPath);
    }

    // === R2'YE YÜKLE ===
    const buffer = await fs.readFile(finalPath);
    const key = `events/${Date.now()}_${crypto.randomUUID()}.jpg`;
    const url = await uploadToR2(key, buffer, 'image/jpeg');

    // local dosyayı temizle
    await fs.unlink(finalPath).catch(() => {});

    // R2 public URL döndür
    return res.status(201).json({ url, key });

  } catch (error) {
    console.error('Dosya yükleme hatası:', error);
    if (req.file) {
      const tmp = path.resolve(path.join(imgDir, path.basename(req.file.filename)));
      await fs.unlink(tmp).catch(() => {});
    }
    return res.status(500).json({ message: 'Dosya yüklenemedi', error: error.message });
  }
});

module.exports = router;
