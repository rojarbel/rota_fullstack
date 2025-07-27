// Dotenv'i oku


require('dotenv').config();
const cron = require('node-cron');
// Zamanlanmış görevi ve fonksiyonunu al
const { silGecmisEtkinlikler, scheduleDeleteOldEvents } = require("./jobs/deleteOldEvents");
const { cleanupCache } = require("./utils/geocodeCache");

// Uygulama başladığında eski etkinlikleri hemen temizle
silGecmisEtkinlikler().catch(err =>
  console.error("silGecmisEtkinlikler başlangıç hatası:", err)
);
cleanupCache().catch(err =>
  console.error("cleanupCache başlangıç hatası:", err)
);
cron.schedule("0 3 * * *", cleanupCache);
// Paketleri import et
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const bildirimRoute = require("./routes/bildirim");
const compression = require('compression');

// App oluştur
const app = express();

// Middleware'ler
app.use(cors());
app.use(compression());
app.use(express.json());

// Static dosya (Görseller için)
app.use(
  '/img',
  express.static(path.join(__dirname, 'public/img'), {
    maxAge: '30d',
    immutable: true,
  })
);


// Route'lar
const authRoutes = require('./routes/auth');
const userRoutes = require("./routes/user");
const etkinlikRoutes = require("./routes/etkinlik");
const uploadRoute = require('./routes/upload');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/etkinlik', etkinlikRoutes);
app.use('/api/upload', uploadRoute);
app.use("/api/yorum", require("./routes/yorum"));
app.use("/api/bildirim", bildirimRoute);

app.get("/etkinlik/:id", (req, res) => {
  res.sendFile(path.join(__dirname, "public/deeplink/index.html"));
});

// Basit test endpoint'i
app.get('/', (req, res) => {
  res.send('Backend çalışıyor!');
});

// MongoDB bağlantısı
mongoose.connect(process.env.MONGO_URL)
  .then(() => {
    console.log("✅ MongoDB bağlantısı başarılı");
    scheduleDeleteOldEvents();
const PORT = process.env.PORT || 5000;


app.listen(PORT, () => 
  console.log(`🚀 Sunucu ${PORT} portunda çalışıyor`)
);
  })
  .catch((err) => {
    console.error("❌ MongoDB bağlantı hatası:", err.message);
  });
