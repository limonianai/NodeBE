const jwt = require('jsonwebtoken');

module.exports.checkAdminAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Yetkisiz erişim, token eksik.' });
  }

  try {
    const decoded = jwt.verify(token, 'SuperSecretKeyThatIs32CharsLongAndSecure!');
    
    if (decoded.role !== 'Admin') {
      return res.status(403).json({ message: 'Yetki yok, sadece admin erişebilir.' });
    }

    req.user = decoded; // İsteğe kullanıcı bilgisini ekle
    next(); // Devam et
  } catch (err) {
    return res.status(401).json({ message: 'Geçersiz veya süresi dolmuş token.' });
  }
};
