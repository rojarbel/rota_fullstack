require("dotenv").config();
const { MongoClient, ObjectId } = require("mongodb");

async function run() {
  const uri = process.env.MONGO_URL;
  const client = new MongoClient(uri, { useUnifiedTopology: true });

  try {
    await client.connect();
    const db = client.db(); // rotaDB otomatik algılanır
    const collection = db.collection("etkinliks");

    const cursor = collection.find({
      location: { $exists: false },
      latitude: { $ne: null },
      longitude: { $ne: null }
    });

    let updatedCount = 0;

    while (await cursor.hasNext()) {
      const doc = await cursor.next();

      const result = await collection.updateOne(
        { _id: doc._id },
        {
          $set: {
            location: {
              type: "Point",
              coordinates: [doc.longitude, doc.latitude]
            }
          }
        }
      );

      if (result.modifiedCount > 0) updatedCount++;
    }

    console.log(`✅ Güncellenen etkinlik sayısı: ${updatedCount}`);
  } catch (err) {
    console.error("❌ HATA:", err);
  } finally {
    await client.close();
  }
}

run();
