const verifyAdmin = (req, res, next) => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Yetkisiz" });
    }
    next();
  };
  
  module.exports = verifyAdmin;
  