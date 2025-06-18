// models/Bildirim.js
const mongoose = require("mongoose");

const BildirimSchema = new mongoose.Schema(
  {
    kullaniciId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tip: {
      type: String,
      enum: ["favori", "yanit", "begeni"],
      required: true,
    },
    etkinlikId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Etkinlik",
    },
    yorumId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Yorum",
    },
    mesaj: {
      type: String,
      required: true,
    },
    okunduMu: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Bildirim", BildirimSchema);
