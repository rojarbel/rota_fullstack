// models/Yorum.js
const mongoose = require("mongoose");

const YorumSchema = new mongoose.Schema({
  etkinlikId: { type: mongoose.Schema.Types.ObjectId, ref: "Etkinlik", required: true },
  kullaniciId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  kullanici: String,
  yorum: String,
  avatarUrl: String,
  avatarUrl: { type: String },
  tarih: { type: Date, default: Date.now },
  ustYorumId: { type: mongoose.Schema.Types.ObjectId, ref: "Yorum", default: null },
  begeni: { type: Number, default: 0 },

  // 👇 EKLENECEK ALAN
  begenenler: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
});

module.exports = mongoose.model("Yorum", YorumSchema);
