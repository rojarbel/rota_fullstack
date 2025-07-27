const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const Joi = require('joi');
const clientUrl = process.env.CLIENT_BASE_URL || "https://example.com";
const MAX_RESET_ATTEMPTS = 5;
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ message: 'Too many requests, please try again later.' });
  },
});
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ message: 'Too many login attempts, please try again later.' });
  },
});

const registerSchema = Joi.object({
  username: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const resetPasswordRequestSchema = Joi.object({
  email: Joi.string().email().required(),
});

const verifyResetCodeSchema = Joi.object({
  email: Joi.string().email().required(),
  code: Joi.string().required(),
  newPassword: Joi.string().required(),
});
// Kayıt
router.post('/register', async (req, res) => {
    const { error } = registerSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
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


    res.status(201).json({ message: 'Kayıt başarılı, aktivasyon e-postası gönderildi' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Giriş

router.post('/login', loginLimiter, async (req, res) => {
  const { error } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
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
  }, process.env.JWT_SECRET, { expiresIn: "365d" });


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
          : `https://${req.get("host")}${user.image || ''}`
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Şifre sıfırlama bağlantısı isteği
router.post('/reset-password-request', resetLimiter, async (req, res) => {
    const { error } = resetPasswordRequestSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({ message: "Eğer bu e-posta kayıtlıysa, sıfırlama kodu gönderildi." });

    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordCode = code;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    user.resetPasswordAttempts = 0;
    await user.save();

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
      subject: 'Şifre Sıfırlama Kodu',
      html: `<p>Şifre sıfırlama kodunuz: <b>${code}</b></p>`
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Eğer bu e-posta kayıtlıysa, sıfırlama kodu gönderildi." });


  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Şifre sıfırlama isteği başarısız oldu." });
  }
});

router.post('/verify-reset-code', resetLimiter, async (req, res) => {
    const { error } = verifyResetCodeSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
  const { email, code, newPassword } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || !user.resetPasswordCode) {
      return res.status(400).json({ message: 'Kod geçersiz veya süresi dolmuş' });
    }

    if (user.resetPasswordExpires < Date.now()) {
            user.resetPasswordCode = undefined;
      user.resetPasswordExpires = undefined;
      user.resetPasswordAttempts = 0;
      await user.save();
      return res.status(400).json({ message: 'Kod geçersiz veya süresi dolmuş' });
    }
    if (user.resetPasswordAttempts >= MAX_RESET_ATTEMPTS) {
      return res.status(429).json({ message: 'Çok fazla deneme yapıldı, lütfen yeni bir sıfırlama isteğinde bulunun.' });
    }
    if (user.resetPasswordCode !== code) {
      user.resetPasswordAttempts += 1;
      await user.save();
      return res.status(400).json({ message: 'Kod geçersiz' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    user.resetPasswordCode = undefined;
    user.resetPasswordExpires = undefined;
    user.resetPasswordAttempts = 0;
    await user.save();

    res.json({ message: 'Şifre başarıyla güncellendi' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Şifre güncellenemedi' });
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
        }, process.env.JWT_SECRET, { expiresIn: "365d" });

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
// Access token refresh
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token gerekli' });
  }
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }
    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        avatar: user.image,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: '365d' }
    );
    res.json({ accessToken: token });
  } catch (err) {
    res.status(401).json({ message: 'Geçersiz token' });
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
