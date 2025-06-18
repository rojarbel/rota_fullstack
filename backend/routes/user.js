const multer = require("multer");
const path = require("path");
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const verifyToken = require("../middleware/verifyToken");
const verifyAdmin = require("../middleware/verifyAdmin");
const bcrypt = require("bcryptjs");

// Tüm kullanıcıları getir (admin değilse boş array dön)
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../public/img/profil"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + ".jpg");
  },
});

const uploadProfile = multer({ storage: profileStorage });
router.get("/", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const users = await User.find({}, "email role createdAt");
    const usersWithId = users.map(u => ({
      id: u._id.toString(),
      email: u.email,
      role: u.role,
      createdAt: u.createdAt
    }));
    res.status(200).json(usersWithId);
  } catch (err) {
    res.status(500).json({ message: "Kullanıcılar listelenemedi", error: err });
  }
});

router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("role");

    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    }

    res.status(200).json({ role: user.role });
  } catch (err) {
    res.status(500).json({ message: "Sunucu hatası", error: err.message });
  }
});

// Kullanıcı bilgilerini güncelle (sadece giriş yapmış kullanıcı)
router.put("/update", verifyToken, uploadProfile.single("image"), async (req, res) => {
  const { email, fullname, city, birthDate } = req.body;
  const image = req.file ? `/img/profil/${req.file.filename}` : null;

  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      {
        email,
        fullname,
        city,
        birthDate,
        ...(image && { image }),
      },
      { new: true }
    );


let fullImageUrl = updatedUser.image;
if (req.file) {
  fullImageUrl = `${req.protocol}://${req.get("host")}/img/profil/${req.file.filename}`;
} else if (updatedUser.image && !updatedUser.image.startsWith("http")) {
  fullImageUrl = `${req.protocol}://${req.get("host")}${updatedUser.image}`;
}

res.status(200).json({
  message: "Güncelleme başarılı",
  user: {
    ...updatedUser._doc,
    image: fullImageUrl,
  },
});
  } catch (err) {
    res.status(500).json({ message: "Sunucu hatası", error: err.message });
  }
});

// Şifre değiştirme (sadece giriş yapmış kullanıcı)
router.put("/change-password", verifyToken, async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Mevcut şifre hatalı." });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    user.password = hashedPassword;
    await user.save();
    res.status(200).json({ message: "Şifre başarıyla değiştirildi." });
  } catch (err) {
    res.status(500).json({ message: "Sunucu hatası.", error: err.message });
  }
});

// Rol değiştir (sadece admin)
router.put("/change-role/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { role: req.body.role },
      { new: true }
    );
    res.status(200).json({ message: "Rol güncellendi", user: updatedUser });
  } catch (err) {
    res.status(500).json({ message: "Rol değiştirilemedi", error: err.message });
  }
});

// Kullanıcı sil (sadece admin)
router.delete("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }
    res.status(200).json({ message: "Kullanıcı silindi" });
  } catch (err) {
    res.status(500).json({ message: "Kullanıcı silinemedi", error: err.message });
  }
});

module.exports = router;
