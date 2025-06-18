const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const clientUrl = process.env.CLIENT_BASE_URL || "https://example.com";


// Kayıt
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Zaten kayıtlı' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const activationToken = crypto.randomBytes(32).toString('hex');
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      fullname: username,
      image: "",
      activationToken,
      activationExpires: Date.now() + 24 * 60 * 60 * 1000
    });

    await newUser.save();
        const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Hesabınızı Aktive Edin',
      html: `
        <p>Merhaba,</p>
        <p>Hesabınızı aktive etmek için aşağıdaki bağlantıya tıklayın:</p>
        <a href="${clientUrl}/activate?token=${activationToken}">Hesabı Aktive Et</a>
        <p>Bu bağlantı 24 saat geçerlidir.</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({ message: 'Kayıt başarılı, aktivasyon e-postası gönderildi' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Giriş

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ message: 'Şifre yanlış' });

    // 🔥 Eksik olan satır:
    const token = jwt.sign({
    id: user._id,
    username: user.username,
    avatar: user.image,
    role: user.role, // ✅ EKLE
  }, process.env.JWT_SECRET, { expiresIn: "1d" });


    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "365d" }
    );

    res.json({
      token, // artık tanımlı ✅
      refreshToken,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullname: user.fullname || '',
        birthDate: user.birthDate || '',
        city: user.city || '',
        image: user.image?.startsWith('http')
          ? user.image
          : `${req.protocol}://${req.get("host")}${user.image || ''}`
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Şifre sıfırlama bağlantısı isteği
router.post('/reset-password-request', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({ message: "Eğer bu e-posta kayıtlıysa, sıfırlama bağlantısı gönderildi." });
    }

    const resetToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    // 🔥 MAIL GÖNDERME İŞİ BURADA:
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

  

    const mailOptions = {
  from: process.env.EMAIL_USER,
  to: email,
  subject: 'Şifre Sıfırlama',
  html: `
    <p>Merhaba,</p>
    <p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:</p>
    <a href="${clientUrl}/reset-password/${resetToken}">
      Şifreyi Sıfırla
    </a>
    <p>Bu bağlantı 15 dakika geçerlidir.</p>
  `
};

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Eğer bu e-posta kayıtlıysa, sıfırlama bağlantısı gönderildi." });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Şifre sıfırlama isteği başarısız oldu." });
  }
});

router.post("/google-check", async (req, res) => {
  const { email } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // giriş: token üret
      const token = jwt.sign({
        id: existingUser._id,
        username: existingUser.username,
        avatar: existingUser.image,
        role: existingUser.role,
      }, process.env.JWT_SECRET, { expiresIn: "1d" });

      return res.status(200).json({
        token,
        user: existingUser
      });
    } else {
      // kayıt yok, frontend'e \"şifre belirlet\" denilecek
      return res.status(404).json({ message: "Kayıt bulunamadı" });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/activate", async (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ message: "Token gerekli" });
  }

  try {
    const user = await User.findOne({
      activationToken: token,
      activationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: "Token geçersiz veya süresi dolmuş" });
    }

    user.emailConfirmed = true;
    user.activationToken = undefined;
    user.activationExpires = undefined;
    await user.save();

    res.json({ message: "Hesap başarıyla aktifleştirildi" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
