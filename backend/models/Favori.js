const mongoose = require("mongoose");

const favoriSchema = new mongoose.Schema({
  etkinlikId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Etkinlik",
    required: true
  },
  kullaniciId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  avatarUrl: {
    type: String,
    default: ""
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Favori", favoriSchema);