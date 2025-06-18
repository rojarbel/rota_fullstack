// backend/seed.js

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Etkinlik = require('./models/Etkinlik'); // Model dosyanı doğru göster
const etkinlikler = require('./data/tumEtkinlikler'); // Tüm etkinlikler verisi

dotenv.config();

// Veritabanına bağlan
mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('MongoDB bağlantısı başarılı.');
  seedData();
})
.catch((err) => {
  console.error('MongoDB bağlantı hatası:', err);
});

// Verileri MongoDB'ye yükle
const seedData = async () => {
  try {
    await Etkinlik.deleteMany(); // Önce tüm etkinlikleri sil (temiz başlangıç)
    await Etkinlik.insertMany(etkinlikler);
    console.log('Örnek etkinlikler başarıyla eklendi!');
    process.exit(); // işlem bitince çık
  } catch (err) {
    console.error('Seed işlemi hatası:', err);
    process.exit(1);
  }
};
