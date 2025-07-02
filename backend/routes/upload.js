const express = require('express');
const multer = require('multer');
const path = require('path');
const { Worker } = require('worker_threads');
const fs = require('fs');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/img'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Sadece jpeg, png ve webp yüklenebilir.'));
    }
  }
});


router.post('/', upload.single('file'), (req, res) => {
  try {
    const originalPath = path.join(__dirname, '../public/img', req.file.filename);
        // İşlemci işini arka planda yapmak için worker kullan
    const worker = new Worker(path.join(__dirname, '../jobs/imageWorker.js'));
    worker.postMessage({ filePath: originalPath });
    worker.on('error', (err) => {
      console.error('Worker hatası:', err);
    });

    res.status(202).json({ filename: req.file.filename });
  } catch (error) {
    console.error('Dosya yükleme hatası:', error);
    res.status(500).json({ message: 'Dosya yüklenemedi' });
  }
});

module.exports = router;
