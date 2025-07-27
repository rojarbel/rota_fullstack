const fs = require("fs").promises;
const path = require("path");
const axios = require("axios");

const cacheFile = path.join(__dirname, "geocode-cache.json");
let cache = {};
const DEFAULT_TTL_DAYS = 30;
const ttlMs = DEFAULT_TTL_DAYS * 24 * 60 * 60 * 1000;
// 📦 Async olarak dosyadan cache oku
(async () => {
  try {
    await fs.access(cacheFile); // dosya varsa
    const raw = await fs.readFile(cacheFile, "utf8");
    cache = JSON.parse(raw);
  } catch (err) {
    cache = {}; // yoksa boş başlat
  }
})();

async function geocode(address) {
  if (!address) return null;

  const now = Date.now();
  let cached = cache[address];

  if (cached) {
    // Geçerlilik kontrolü
    if (!cached.timestamp) {
      // Eski formatı dönüştür
      cached = { coords: cached, timestamp: now };
      cache[address] = cached;
      await fs.writeFile(cacheFile, JSON.stringify(cache, null, 2));
      return cached.coords;
    }

    if (now - cached.timestamp < ttlMs) {
      return cached.coords;
    }
    // Süresi dolmuşsa sil
    delete cache[address];
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.warn("GOOGLE_MAPS_API_KEY not set, geocoding disabled");
    return null;
  }

  const url = "https://maps.googleapis.com/maps/api/geocode/json";

  try {
    const { data } = await axios.get(url, { params: { address, key: apiKey } });

    if (data.status === "OK" && data.results.length > 0) {
      const loc = data.results[0].geometry.location;
      cache[address] = { coords: loc, timestamp: now };

      try {
        await fs.writeFile(cacheFile, JSON.stringify(cache, null, 2));
      } catch (e) {
        console.warn("⚠️ Cache dosyası yazılamadı:", e.message);
      }

      return loc;
    }
  } catch (err) {
    console.error("Geocoding error:", err.message);
  }

  return null;
}

async function cleanupCache(maxAgeDays = DEFAULT_TTL_DAYS) {
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  let changed = false;
  for (const [key, value] of Object.entries(cache)) {
    const ts = value.timestamp || 0;
    if (ts < cutoff) {
      delete cache[key];
      changed = true;
    }
  }
  if (changed) {
    try {
      await fs.writeFile(cacheFile, JSON.stringify(cache, null, 2));
    } catch (e) {
      console.warn("⚠️ Cache dosyası yazılamadı:", e.message);
    }
  }
}

module.exports = { geocode, cleanupCache };
