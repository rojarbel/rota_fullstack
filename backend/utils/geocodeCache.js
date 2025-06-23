const fs = require('fs');
const path = require('path');
const axios = require('axios');

const cacheFile = path.join(__dirname, 'geocode-cache.json');
let cache = {};

try {
  if (fs.existsSync(cacheFile)) {
    cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  }
} catch (err) {
  cache = {};
}

async function geocode(address) {
  if (!address) return null;
  if (cache[address]) return cache[address];

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.warn('GOOGLE_MAPS_API_KEY not set, geocoding disabled');
    return null;
  }

  const url = 'https://maps.googleapis.com/maps/api/geocode/json';
  try {
    const { data } = await axios.get(url, { params: { address, key: apiKey } });
    if (data.status === 'OK' && data.results.length > 0) {
      const loc = data.results[0].geometry.location;
      cache[address] = loc;
      try {
        fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
      } catch (e) {
        // Ignore file write errors
      }
      return loc;
    }
  } catch (err) {
    console.error('Geocoding error:', err.message);
  }
  return null;
}

module.exports = { geocode };