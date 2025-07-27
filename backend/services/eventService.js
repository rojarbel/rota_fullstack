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
  // ÜCRETSİZ SEKMESİ: Tüm etkinlikleri ucuzdan pahalıya sırala
  // Ücretsiz olanlar doğal olarak en başta gelecek
  
  pipeline.push({
    $addFields: {
      fiyatSayisal: {
        $cond: [
          {
            $or: [
              { $in: ["$fiyat", ["", " ", null, undefined, "Ücretsiz", "ücretsiz", "ÜCRETSİZ", "ücretsiz ", "Ücretsiz ", "free", "FREE"]] },
              { $eq: ["$fiyat", 0] },
              { $eq: ["$fiyat", "0"] },
              { $eq: ["$fiyat", "0.00"] }
            ]
          },
          0, // Ücretsiz etkinlikler için 0
          {
            // Ücretli etkinlikler için fiyat çıkarma
            $let: {
              vars: {
                fiyatString: { $toString: "$fiyat" },
              },
              in: {
                $toDouble: {
                  $ifNull: [
                    {
                      $convert: {
                        input: {
                          $arrayElemAt: [
                            {
                              $regexFindAll: {
                                input: "$$fiyatString",
                                regex: /(\d+(?:\.\d+)?)/
                              }
                            }, 0
                          ]
                        }.match,
                        to: "double",
                        onError: 999999 // Geçersiz fiyatları en sona at
                      }
                    },
                    999999
                  ]
                }
              }
            }
          }
        ]
      }
    }
  });

  // Ucuzdan pahalıya sırala (önce fiyat, sonra alfabetik)
  pipeline.push({ 
    $sort: { 
      fiyatSayisal: 1,  // Ucuzdan pahalıya (0, 10, 20, 50, ...)
      baslik: 1         // Aynı fiyatta alfabetik
    } 
  });
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
    // POPÜLER SEKMESİ: Tüm etkinlikleri dahil et, popülerlik skoruna göre sırala
    
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
            { $ifNull: ["$tiklanmaSayisi", 0] }, // 0 olabilir, 1 değil
            { $multiply: [{ $size: "$favoriler" }, 10] },
            { $multiply: [{ $size: "$yorumlar" }, 5] }
          ]
        }
      }
    });

    // SORUN BURADAydı: populerSkor > 0 koşulunu kaldırdık
    // Artık popülerlik skoru 0 olan etkinlikler de gösterilecek
    
    // Popüler skor yüksekten alçağa, sonra alfabetik
    pipeline.push({
      $sort: {
        populerSkor: -1,  // Yüksek skordan düşüğe
        baslik: 1         // Aynı skorda alfabetik
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
  
  // hasMore kontrolü için daha doğru bir yaklaşım
  // Bir sonraki sayfa var mı kontrol et
  const nextPagePipeline = [...pipeline];
  nextPagePipeline[nextPagePipeline.length - 2] = { $skip: skip + dynamicLimit }; // skip değerini artır
  nextPagePipeline[nextPagePipeline.length - 1] = { $limit: 1 }; // sadece 1 kayıt al
  
  const nextPageExists = await Etkinlik.aggregate(nextPagePipeline);
  const hasMore = nextPageExists.length > 0;
  
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