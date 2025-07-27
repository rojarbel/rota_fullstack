// scripts/fixCoordinates.js
const { MongoClient } = require("mongodb");
require("dotenv").config();
const uri = process.env.MONGO_URL;
const client = new MongoClient(uri);

async function fixCoords() {
  try {
    await client.connect();
    const db = client.db("rotaDB");
    const col = db.collection("etkinliks");

    const etkinlikler = await col.find({}).toArray();

    for (const e of etkinlikler) {
      const lat = typeof e.latitude === "string" ? parseFloat(e.latitude) : e.latitude;
      const lon = typeof e.longitude === "string" ? parseFloat(e.longitude) : e.longitude;

      if (!isNaN(lat) && !isNaN(lon)) {
        await col.updateOne({ _id: e._id }, { $set: { latitude: lat, longitude: lon } });
        console.log(`✅ Güncellendi: ${e.baslik}`);
      } else {
        console.warn(`❌ Geçersiz koordinat: ${e.baslik}`);
      }
    }

    console.log("\n✨ Tüm koordinatlar düzeltildi.");
  } catch (err) {
    console.error("Hata: ", err);
  } finally {
    await client.close();
  }
}

fixCoords();