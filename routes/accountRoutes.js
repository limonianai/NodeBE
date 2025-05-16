const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const mssql = require('mssql');

const router = express.Router();
const jwtSecret = 'SuperSecretKeyThatIs32CharsLongAndSecure!';

// Kullanıcı kayıt endpoint'i
router.post('/register', async (req, res) => {
  const { username, password, role } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10); // Şifreyi hashle
    const pool = await mssql.connect();

    await pool.request()
      .input('username', mssql.NVarChar, username)
      .input('passwordHash', mssql.NVarChar, hashedPassword)
      .input('role', mssql.NVarChar, role || 'User')
      .query(`
        INSERT INTO Users (Username, PasswordHash, Role)
        VALUES (@username, @passwordHash, @role)
      `);

    res.status(201).json({ message: 'Kullanıcı başarıyla oluşturuldu.' });
  } catch (err) {
    console.error('Kayıt sırasında hata oluştu:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
    
  }
});
// Kullanıcı giriş endpoint'i
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
  
    try {
      const pool = await mssql.connect();
      const result = await pool.request()
        .input('username', mssql.NVarChar, username)
        .query('SELECT * FROM Users WHERE Username = @username');
  
      const user = result.recordset[0];
  
      if (!user) {
        return res.status(401).json({ message: 'Kullanıcı bulunamadı.' });
      }
  
      const passwordMatch = await bcrypt.compare(password, user.PasswordHash);
      if (!passwordMatch) {
        return res.status(401).json({ message: 'Yanlış şifre.' });
      }
  
      // JWT token oluştur
      const token = jwt.sign(
        {
          sub: user.Username,
          userId: user.Id,
          role: user.Role,
          department: user.Department,
        },
        jwtSecret,
        { expiresIn: '3h' }
      );
  
      // Admin olup olmadığını belirle
      const isAdmin = user.Role === 'Admin';
  
      res.json({ token, expiration: '3 saat', isAdmin,username:user.Username,userid:user.Id,department:user.Department });
    } catch (err) {
      console.error('Giriş sırasında hata oluştu:', err);
      res.status(500).json({ message: 'Sunucu hatası.' });
    }
  });
 router.get('/profile/:username', async (req, res) => {
     const { username } = req.params;
     console.log(username);
     try {
       const pool = await mssql.connect();
       const result = await pool.request()
         .input('username', mssql.NVarChar, username)
         .query(`
         SELECT Username, Role, Department FROM USERS WHERE Username=@username
         `);
   console.log(result.recordset);
       res.status(200).json(result.recordset);
     } catch (err) {
       console.error('Thread listeleme sırasında hata oluştu:', err);
       res.status(500).json({ message: 'Sunucu hatası' });
     }
   });
module.exports = router;
