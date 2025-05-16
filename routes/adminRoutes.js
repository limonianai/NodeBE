// routes/adminRoutes.js

const express = require('express');
const bcrypt = require('bcrypt');
const mssql = require('mssql');
const { checkAdminAuth } = require('../middleware/authMiddleware'); // Admin auth middleware
const { OpenAI } = require('openai');
const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY1 });
// Kullanıcı oluşturma endpoint'i
// Kullanıcı oluşturma endpoint'i
router.post('/create-user', checkAdminAuth, async (req, res) => {
  const { username, password, role, department } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ message: 'Kullanıcı adı, şifre ve rol gerekli.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const pool = await mssql.connect();

    await pool.request()
      .input('username', mssql.NVarChar, username)
      .input('passwordHash', mssql.NVarChar, hashedPassword)
      .input('role', mssql.NVarChar, role)
      .input('department', mssql.NVarChar, department || null)
      .query(`
        INSERT INTO Users (Username, PasswordHash, Role, Department)
        VALUES (@username, @passwordHash, @role, @department)
      `);

    res.status(201).json({ message: 'Kullanıcı başarıyla oluşturuldu.' });
  } catch (err) {
    console.error('Kullanıcı oluşturulurken hata oluştu:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});


// Tüm kullanıcıları listeleme endpoint'i
router.get('/list-users', checkAdminAuth, async (req, res) => {
  try {
    const pool = await mssql.connect();
    const result = await pool.request().query(`SELECT Id, Username, Role, Department FROM Users`);

    res.status(200).json(result.recordset);
  } catch (err) {
    console.error('Kullanıcıları listeleme sırasında hata:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

// Kullanıcı silme endpoint'i
router.delete('/delete-user/:id', checkAdminAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await mssql.connect();
    await pool.request()
      .input('id', mssql.Int, id)
      .query(`DELETE FROM Users WHERE Id = @id`);

    res.status(200).json({ message: 'Kullanıcı başarıyla silindi.' });
  } catch (err) {
    console.error('Kullanıcı silme sırasında hata:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

// Sohbet geçmişini getirme endpoint'i
router.get('/chat-interactions', checkAdminAuth, async (req, res) => {
    const userId = req.query.userId;
    let query = `
      SELECT c.Id, u.Username, t.Title, c.Query AS Message, c.Response, c.Timestamp
      FROM ChatInteractions c
      INNER JOIN Users u ON c.UserId = u.Id
      INNER JOIN Threads t ON c.ThreadId = t.ThreadId
    `;
  
    if (userId) {
      query += ' WHERE c.UserId = @userId';
    }
  
    query += ' ORDER BY c.Timestamp DESC';
  
    try {
      const pool = await mssql.connect();
      const request = pool.request();
  
      if (userId) {
        request.input('userId', mssql.Int, userId);
      }
  
      const result = await request.query(query);
  
      res.status(200).json(result.recordset);
    } catch (err) {
      console.error('Sohbet geçmişi alınırken hata oluştu:', err);
      res.status(500).json({ message: 'Sunucu hatası.' });
    }
  });
  
// Dashboard istatistiklerini getirme endpoint'i
router.get('/dashboard-stats', checkAdminAuth, async (req, res) => {
  try {
    const pool = await mssql.connect();
    const usersResult = await pool.request().query('SELECT COUNT(*) AS TotalUsers FROM Users');
    const interactionsResult = await pool.request().query('SELECT COUNT(*) AS TotalInteractions FROM ChatInteractions');

    res.status(200).json({
      users: usersResult.recordset[0].TotalUsers,
      interactions: interactionsResult.recordset[0].TotalInteractions,
    });
  } catch (err) {
    console.error('Dashboard istatistikleri alınırken hata oluştu:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

router.get('/top-users', checkAdminAuth, async (req, res) => {
  try {
    const pool = await mssql.connect();
    const result = await pool.request().query(`
      SELECT u.Id AS UserId, u.Username,u.Department, COUNT(c.Id) AS MessageCount
      FROM ChatInteractions c
      INNER JOIN Users u ON c.UserId = u.Id
      GROUP BY u.Id, u.Username,u.Department
      ORDER BY MessageCount DESC
      OFFSET 0 ROWS FETCH NEXT 5 ROWS ONLY
    `);

    res.status(200).json(result.recordset);
  } catch (err) {
    console.error('En aktif kullanıcılar alınırken hata oluştu:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});
// Departman bazında chat kullanım sayısını getirme endpoint'i
router.get('/department-chat-stats', checkAdminAuth, async (req, res) => {
  try {
    const pool = await mssql.connect();
    const result = await pool.request().query(`
      SELECT u.Department, COUNT(c.Id) AS ChatCount
      FROM ChatInteractions c
      INNER JOIN Users u ON c.UserId = u.Id
      GROUP BY u.Department
    `);

    res.status(200).json(result.recordset);
  } catch (err) {
    console.error('Departman bazında chat kullanım istatistikleri alınırken hata oluştu:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});
// Toplam dosya sayısını OpenAI Assistant API'den getirme endpoint'i
router.get('/file-count', checkAdminAuth, async (req, res) => {
  try {
    const response = await openai.beta.vectorStores.files.list(
      "vs_bTLIBv0NEFW0x2V4ph3SrCCz"
    );

    // Gelen yanıt doğrudan bir dizi olduğundan length özelliği burada alınır
    const fileCount = response.data.length;

    res.status(200).json({ count: fileCount });
  } catch (err) {
    console.error('OpenAI Assistant API kullanılarak dosya sayısı alınırken hata oluştu:', err);
    res.status(500).json({ message: 'Dosya sayısı alınırken hata oluştu.' });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const pool = await mssql.connect();

    console.log('Veritabanı bağlantısı başarılı.');

    // Son 10 dakikada oluşturulmuş bir özet var mı kontrol et
    console.log('Son oluşturulan özet kontrol ediliyor...');
    const result = await pool.request()
      .query(`SELECT TOP 1 Content, CreatedAt FROM Summaries ORDER BY CreatedAt DESC`);

    if (result.recordset.length > 0) {
      const lastSummary = result.recordset[0];
      const timeDiff = (new Date() - new Date(lastSummary.CreatedAt)) / 60000; // Dakika cinsinden fark
      console.log(`Son özet ${timeDiff.toFixed(2)} dakika önce oluşturulmuş.`);
      

      if (timeDiff <= 10) {
        console.log('Son 10 dakikada oluşturulmuş özet bulundu, döndürülüyor.');
        return res.status(200).json({ summary: lastSummary.Content });
      }
    } else {
      console.log('Veritabanında mevcut bir özet bulunamadı.');
    }

    // Yeni thread oluştur
    console.log('Yeni thread oluşturuluyor...');
    const newThread = await openai.beta.threads.create();
    if (!newThread.id) {
      throw new Error('Thread oluşturulamadı.');
    }

    const currentThreadId = newThread.id;
    console.log('Yeni thread oluşturuldu:', currentThreadId);

    // Mesaj gönder
    await openai.beta.threads.messages.create(currentThreadId, {
      role: 'user',
      content: 'Vector storedaki dosyalarımızı inceleyerek genel bir özet oluştur. Burada bahsedilen dosyalar vector store daki dosyalardır. Cevaba şu şekilde başla: "Merhaba admin, senin için bir özet çıkardım;',
    });

    // Streaming ile yanıt al
    console.log('Streaming başlatılıyor...');
    const stream = await openai.beta.threads.runs.create(currentThreadId, {
      assistant_id: process.env.ASSISTANT_ID,
      stream: true,
    });

    res.writeHead(200, { 'Content-Type': 'text/plain' });

    let summary = '';
    for await (const chunk of stream) {
      if (chunk.event === 'thread.message.delta' && Array.isArray(chunk.data.delta.content)) {
        const contentArray = chunk.data.delta.content;
        const text = contentArray.map(item => item.text.value).join('');
        summary += text;
        res.write(text); // Anlık olarak istemciye yaz
      }
    }

    console.log('Tamamlanan özet:', summary);

    // Yeni özeti veritabanına kaydet
    console.log('Yeni özet veritabanına kaydediliyor...');
    await pool.request()
    .input('content', mssql.NVarChar(mssql.MAX), summary)
    .input('createdAt', mssql.DateTime, new Date()) // Doğru saat bilgisini ekle
    .query(`INSERT INTO Summaries (Content, CreatedAt) VALUES (@content, @createdAt)`);  
    console.log('Yeni özet başarıyla veritabanına kaydedildi.');
    res.end();
  } catch (err) {
    console.error('Dosya özetini alırken hata oluştu:', err);
    res.status(500).json({ message: 'Dosya özeti alınırken hata oluştu.' });
  }
});






module.exports = router;
 //Test