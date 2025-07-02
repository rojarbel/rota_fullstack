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
}, {
  timestamps: true
});

// Performans indexleri
favoriSchema.index({ kullaniciId: 1 });
favoriSchema.index({ etkinlikId: 1 });
favoriSchema.index({ kullaniciId: 1, etkinlikId: 1 }, { unique: true });

module.exports = mongoose.model("Favori", favoriSchema);
