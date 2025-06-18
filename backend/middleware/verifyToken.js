const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const header = req.headers["authorization"];

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(403).json({ message: "Token eksik veya format hatalı" });
  }

  const token = header.replace("Bearer ", "");

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Geçersiz token" });
    }

    req.user = decoded; // userId, email, adSoyad burada olacak
    req.user.id = decoded.id || decoded._id; // 🔥 EKLE BUNU
    next();
  });
};

module.exports = verifyToken;
