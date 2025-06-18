const express = require('express');
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
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


router.post('/', upload.single('file'), async (req, res) => {
  try {
    const originalPath = path.join(__dirname, '../public/img', req.file.filename);
    const optimizedPath = originalPath;

    await sharp(originalPath)
      .resize({ width: 1024 })
      .jpeg({ quality: 80 })
      .toFile(optimizedPath);

    res.status(200).json({ filename: req.file.filename });
  } catch (error) {
    console.error('Dosya yükleme hatası:', error);
    res.status(500).json({ message: 'Dosya yüklenemedi' });
  }
});

module.exports = router;
