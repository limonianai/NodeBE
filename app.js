// Gerekli modülleri yükle
const express = require('express');
const jwt = require('jsonwebtoken');
const mssql = require('mssql');
const bodyParser = require('body-parser');
const cors = require('cors');


// Express uygulamasını başlat
const app = express();
const PORT = process.env.PORT || 3000; // Sunucunun çalışacağı port
const jwtSecret = 'SuperSecretKeyThatIs32CharsLongAndSecure!'; // JWT için kullanılan secret key

// Middleware

app.use(cors({
    origin: 'http://localhost:3001', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'], 
    exposedHeaders: ['thread-id']
}));
// app.use(cors({
//   origin: 'https://limonai.vercel.app', 
//   methods: ['GET', 'POST', 'PUT', 'DELETE'],
//   allowedHeaders: ['Content-Type', 'Authorization'], 
//   exposedHeaders: ['thread-id']
// }));
//app.use(cors({ origin: 'https://limonai.vercel.app' }));
app.use(bodyParser.json()); // JSON formatındaki request'leri işleme

// SQL Server bağlantı bilgileri
const sqlConfig = {
    user: 'db_aad545_assistant_admin',            // Veritabanı kullanıcı adı
    password: 'Limoai123.',                 // Veritabanı şifresi (şirketin verdiği şifreyi buraya yaz)
    server: 'SQL6033.site4now.net',               // Veritabanı sunucusu
    database: 'db_aad545_assistant',              // Veritabanı adı
    options: {
      encrypt: true,                              // Azure gibi uzak sunucular için true olmalı
      trustServerCertificate: true                // SSL sertifikasına güven
    }
  };
  
  
  

// Veritabanına bağlanma
mssql.connect(sqlConfig).then(pool => {
  if (pool.connected) {
    console.log('Veritabanına bağlanıldı.');
  }
}).catch(err => {
  console.error('Veritabanı bağlantısı başarısız:', err);
});

// Basit bir test endpoint’i
app.get('/', (req, res) => {
  res.send('Node.js backend projesi çalışıyor!');
});

// Sunucuyu başlatma
app.listen(PORT, () => {
  console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor`);
});

const accountRoutes = require('./routes/accountRoutes');
app.use('/api/account', accountRoutes);
const chatRoutes = require('./routes/chatRoutes');
app.use('/api/chat', chatRoutes);
const adminRoutes = require('./routes/adminRoutes');
app.use('/api/admin', adminRoutes);
const productRoutes = require('./routes/products');
app.use('/api/products', productRoutes);

