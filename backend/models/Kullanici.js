const mongoose = require("mongoose");

const kullaniciSchema = new mongoose.Schema({
  adSoyad: String,
  email: String,
  avatarUrl: String,
  parola: String,
  rol: {
    type: String,
    enum: ["user", "admin"],
    default: "user"
  }
});

module.exports = mongoose.model("Kullanici", kullaniciSchema);