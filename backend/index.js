// Dotenv
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const compression = require('compression');
const cron = require('node-cron');

// Jobs & utils
const { silGecmisEtkinlikler, scheduleDeleteOldEvents } = require('./jobs/deleteOldEvents');
const { cleanupCache } = require('./utils/geocodeCache');

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const etkinlikRoutes = require('./routes/etkinlik');
const uploadRoute = require('./routes/upload');
const bildirimRoute = require('./routes/bildirim');

const app = express();

/* ---------- Middleware ---------- */
app.use(cors());                   // gerekirse origin whitelist ekleyebilirsin
app.use(compression());
app.use(express.json());

/* ---------- Static (görseller) ---------- */
app.use(
  '/img',
  express.static(path.join(__dirname, 'public/img'), {
    maxAge: '30d',
    immutable: true,
  })
);

/* ---------- Routes ---------- */
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/etkinlik', etkinlikRoutes);
app.use('/api/upload', uploadRoute);
app.use('/api/yorum', require('./routes/yorum'));
app.use('/api/bildirim', bildirimRoute);

app.get('/etkinlik/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/deeplink/index.html'));
});

/* ---------- Health & root ---------- */
app.get('/', (_req, res) => res.send('Backend çalışıyor!'));
app.get('/health', (_req, res) => res.send('ok'));

/* ---------- DB connect -> jobs -> listen ---------- */
(async () => {
  try {
    // Mongoose 7+: varsayılanlar yeterli; yalnızca seçim timeout verelim
    await mongoose.connect(process.env.MONGO_URL, { serverSelectionTimeoutMS: 10000 });
    console.log('✅ MongoDB bağlantısı başarılı');

    // Bağlantıdan SONRA tek seferlik bakımlar
    try { await silGecmisEtkinlikler(); } 
    catch (e) { console.error('silGecmisEtkinlikler başlangıç hatası:', e); }

    try { await cleanupCache(); } 
    catch (e) { console.error('cleanupCache başlangıç hatası:', e); }

    // Periyodik işler
    cron.schedule('0 3 * * *', cleanupCache);
    scheduleDeleteOldEvents();

    // Sunucu
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 Sunucu ${PORT} portunda çalışıyor`));
  } catch (err) {
    console.error('❌ MongoDB bağlantı hatası:', err.message);
    // Render'in "port yok" hatasına düşmemek için başarısız bağlantıda çık
    process.exit(1);
  }
})();

/* ---------- İsteğe bağlı: global error guards ---------- */
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
