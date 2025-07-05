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
    adres: String,
    latitude: { type: Number, index: true },
    longitude: { type: Number, index: true },
        location: {
      type: {
        type: String,
        default: 'Point'
      },
      coordinates: [Number]
    },
    onaylandi: { type: Boolean, default: false },
    tiklanmaSayisi: { type: Number, default: 0 },
    favoriSayisi: { type: Number, default: 0 },
    gizli: { type: Boolean, default: false },
  },
  {
    timestamps: true
  }
);
EtkinlikSchema.index({ onaylandi: 1, tarih: 1 });
EtkinlikSchema.index({ favoriSayisi: -1 });
EtkinlikSchema.index({ tiklanmaSayisi: -1 });
EtkinlikSchema.index({ location: '2dsphere' });
EtkinlikSchema.pre("save", function (next) {
  if (this.latitude && this.longitude && !this.location) {
    this.location = {
      type: "Point",
      coordinates: [this.longitude, this.latitude]
    };
  }
  next();
});
module.exports = mongoose.model("Etkinlik", EtkinlikSchema);
