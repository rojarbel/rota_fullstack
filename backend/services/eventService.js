const NodeCache = require("node-cache");
const Etkinlik = require("../models/Etkinlik");

// Cache event queries for 5 minutes to reduce database load.
// The 300 second TTL prevents the in-memory cache from growing indefinitely.

const cache = new NodeCache({ stdTTL: 300, checkperiod: 600 });
function flushEventsCache() {
  cache.flushAll();
}
async function fetchEvents(query) {
  const {
    page = 1,
    limit = 12,
    kategori,
    sehir,
    tur,
    fiyatMin,
    fiyatMax,
    baslangic,
    bitis,
    filter,
  } = query;

  // Dinamik limit belirleme
  let dynamicLimit = parseInt(limit);
  if (filter === 'tum') {
    // İlk sayfa 12, sonraki sayfalar 6
    dynamicLimit = page == 1 ? 12 : 6;
  }

  const cacheKey = `tum:${JSON.stringify({ ...query, dynamicLimit })}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const match = {
    onaylandi: true,
    $or: [{ gizli: false }, { gizli: { $exists: false } }],
    tarihDate: { $gte: now }
  };

  if (kategori) match.kategori = new RegExp(`^${kategori.trim()}$`, "i");
  if (sehir) match.sehir = new RegExp(`^${sehir.trim()}$`, "i");
  if (tur) {
    const turler = Array.isArray(tur) ? tur : [tur];
    if (turler.length > 0) {
      match.tur = { $in: turler.map(t => new RegExp(`^${t}$`, "i")) };
    }
  }

  const pipeline = [
    {
      $addFields: {
        tarihDate: {
          $cond: [
            { $eq: [{ $type: "$tarih" }, "date"] },
            "$tarih",
            { $toDate: "$tarih" }
          ]
        }
      }
    },
    { $match: match },
  ];

  // Filter'a göre özel işlemler
  if (filter?.toLowerCase() === "ucretsiz") {
    pipeline.push({
      $match: {
        fiyat: {
          $in: [
            "", " ", null, undefined,
            0, "0", 0.0, "0.00",
            "Ücretsiz", "ücretsiz", "ÜCRETSİZ", "ücretsiz ", "Ücretsiz ",
            "free", "FREE"
          ]
        }
      }
    });

    // Fiyat sıralaması için sayısal dönüşüm
    pipeline.push({
      $addFields: {
        fiyatSayisal: {
          $cond: [
            {
              $or: [
                { $in: ["$fiyat", ["", " ", null, undefined, "Ücretsiz", "ücretsiz", "ÜCRETSİZ", "free", "FREE"]] },
                { $eq: ["$fiyat", 0] },
                { $eq: ["$fiyat", "0"] }
              ]
            },
            0,
            {
              $toDouble: {
                $ifNull: [
                  {
                    $arrayElemAt: [
                      {
                        $regexFindAll: {
                          input: { $toString: "$fiyat" },
                          regex: /\d+(\.\d+)?/
                        }
                      }, 0
                    ]
                  }.match,
                  "0"
                ]
              }
            }
          ]
        }
      }
    });

    pipeline.push({ $sort: { fiyatSayisal: 1, baslik: 1 } }); // En ucuz önce, sonra alfabetik
  }
  else if (filter?.toLowerCase() === "yaklasan") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    pipeline.push({
      $match: {
        tarihDate: {
          $gte: today,
          $lte: nextWeek
        }
      }
    });

    pipeline.push({ $sort: { tarihDate: 1, baslik: 1 } }); // En yakın tarih önce
  }
  else if (filter?.toLowerCase() === "populer") {
    pipeline.push(
      {
        $lookup: {
          from: "yorums",
          localField: "_id",
          foreignField: "etkinlikId",
          as: "yorumlar"
        }
      },
      {
        $lookup: {
          from: "favoris",
          localField: "_id",
          foreignField: "etkinlikId",
          as: "favoriler"
        }
      }
    );

    pipeline.push({
      $addFields: {
        yorumSayisi: { $size: "$yorumlar" },
        gercekFavoriSayisi: { $size: "$favoriler" },
        populerSkor: {
          $add: [
            { $ifNull: ["$tiklanmaSayisi", 1] },
            { $multiply: [{ $size: "$favoriler" }, 10] },
            { $multiply: [{ $size: "$yorumlar" }, 5] }
          ]
        }
      }
    });

    pipeline.push({
      $match: {
        populerSkor: { $gt: 0 }
      }
    });

    // Popüler skor sıfırdan büyük olanları önce, sonra alfabetik
    pipeline.push({
      $sort: {
        populerSkor: -1,
        baslik: 1
      }
    });
  }

  // Fiyat filtresi (ücretsiz sekmesi değilse)
  const defaultMin = 0;
  const defaultMax = 22104;

  const isFiyatFilterActive =
    filter?.toLowerCase() !== "ucretsiz" &&
    ((fiyatMin && parseFloat(fiyatMin) > defaultMin) ||
    (fiyatMax && parseFloat(fiyatMax) < defaultMax));

  if (isFiyatFilterActive) {
    pipeline.push({
      $addFields: {
        fiyatTemiz: {
          $ifNull: [
            {
              $regexFind: {
                input: "$fiyat",
                regex: /\d+(\.\d+)?/
              }
            },
            { match: null }
          ]
        }
      }
    });

    pipeline.push({
      $addFields: {
        fiyatSayisal: { $toDouble: "$fiyatTemiz.match" }
      }
    });

    const fiyatExpr = { $and: [] };
    if (fiyatMin) fiyatExpr.$and.push({ $gte: ["$fiyatSayisal", parseFloat(fiyatMin)] });
    if (fiyatMax) fiyatExpr.$and.push({ $lte: ["$fiyatSayisal", parseFloat(fiyatMax)] });

    pipeline.push({ $match: { $expr: fiyatExpr } });
  }

  // Tarih aralığı filtreleri
  if (baslangic) {
    pipeline.push({
      $match: {
        tarihDate: { $gte: new Date(baslangic) }
      }
    });
  }

  if (bitis) {
    pipeline.push({
      $match: {
        tarihDate: { $lte: new Date(bitis + 'T23:59:59.999Z') }
      }
    });
  }

  const skip = (parseInt(page) - 1) * dynamicLimit;

  // Genel sıralama (özel sıralama yoksa)
  if (!["populer", "yaklasan", "ucretsiz"].includes(filter?.toLowerCase())) {
    pipeline.push({ $sort: { tarih: 1, baslik: 1 } }); // Tarih önce, sonra alfabetik
  }

  pipeline.push({ $skip: skip });
  pipeline.push({ $limit: dynamicLimit });

  const etkinlikler = await Etkinlik.aggregate(pipeline);
  const hasMore = etkinlikler.length === dynamicLimit;
  const totalCount = await Etkinlik.countDocuments(match);

  const responseData = {
    data: etkinlikler.map(e => ({
      ...e,
      _id: e._id?.toString?.() ?? e.id,
    })),
    hasMore,
    totalCount
  };

  cache.set(cacheKey, responseData);
  return responseData;
}

module.exports = {
  fetchEvents,
    flushEventsCache,
};