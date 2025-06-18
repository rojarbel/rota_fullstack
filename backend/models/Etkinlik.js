const mongoose = require("mongoose");

const EtkinlikSchema = new mongoose.Schema(
  {
    baslik: String,
    sehir: { type: String, index: true },
    kategori: { type: String, index: true },
    tur: { type: String, index: true },
    tarih: { type: Date, required: true, index: true },
    fiyat: String,
    aciklama: String,
    gorsel: String,
    onaylandi: { type: Boolean, default: false },
    tiklanmaSayisi: { type: Number, default: 0 },
    favoriSayisi: { type: Number, default: 0 },
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Etkinlik", EtkinlikSchema);
