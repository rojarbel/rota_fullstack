const fs = require("fs").promises;
const path = require("path");
const axios = require("axios");

const cacheFile = path.join(__dirname, "geocode-cache.json");
let cache = {};

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

  const cached = cache[address];
  if (cached) return cached;

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
      cache[address] = loc;

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

module.exports = { geocode };
