const express = require('express');
const multer = require('multer');
const path = require('path');
const { Worker } = require('worker_threads');
const fs = require('fs/promises');
const crypto = require('crypto');

const verifyToken = require("../middleware/verifyToken");
const verifyAdmin = require("../middleware/verifyAdmin");
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.resolve(path.join(__dirname, '../public/img'));
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(path.basename(file.originalname));
    const uniqueSuffix = crypto.randomUUID();
    cb(null, `${Date.now()}_${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
    limits: { fileSize: 5 * 1024 * 1024 },

  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Sadece jpeg, png ve webp yüklenebilir.'));
    }
  }
});


router.post('/', verifyToken, upload.single('file'), async (req, res) => {
  try {
        if (!req.file) {
      return res.status(400).json({ message: 'Dosya bulunamadı' });
    }
    const imgDir = path.resolve(path.join(__dirname, '../public/img'));
    const sanitizedFilename = path.basename(req.file.filename);
    let originalPath = path.join(imgDir, sanitizedFilename);
    originalPath = path.resolve(originalPath);
    if (!originalPath.startsWith(imgDir)) {
      throw new Error('Invalid file path');
    }
        // İşlemci işini arka planda yapmak için worker kullan
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

    const parsed = path.parse(originalPath);
    let finalPath = originalPath;
    if (parsed.ext.toLowerCase() !== '.jpg' && parsed.ext.toLowerCase() !== '.jpeg') {
      finalPath = path.format({ dir: parsed.dir, name: parsed.name, ext: '.jpg' });
      await fs.rename(originalPath, finalPath);
    }

    res.status(201).json({ filename: path.basename(finalPath) });
  } catch (error) {
    console.error('Dosya yükleme hatası:', error);
    if (req.file) {
      const tmp = path.join(__dirname, '../public/img', req.file.filename);
      await fs.unlink(tmp).catch(() => {});
    }
    res.status(500).json({ message: 'Dosya yüklenemedi', error: error.message });
  }
});

module.exports = router;
