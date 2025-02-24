const express = require('express');
const mssql = require('mssql');
const { OpenAI } = require('openai');
const router = express.Router();
const dotenv = require('dotenv');
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY1 });
console.log(process.env.OPENAI_API_KEY1+"aaa");
router.post('/query', async (req, res) => {
    const { userId, query, threadId } = req.body;
  
    try {
      let currentThreadId = threadId;
  
      // Eğer threadId yoksa yeni bir thread oluştur
      if (!threadId) {
        const newThread = await openai.beta.threads.create();
        if (!newThread.id) {
          throw new Error('Thread oluşturulamadı.');
        }
  
        currentThreadId = newThread.id;
        console.log('Yeni thread oluşturuldu:', currentThreadId);
        const pool = await mssql.connect();
        await pool.request()
          .input('userId', mssql.Int, userId)
          .input('title', mssql.NVarChar, query)
          .input('threadId', mssql.NVarChar, currentThreadId)
          .query(`
            INSERT INTO Threads (UserId, Title, ThreadId)
            VALUES (@userId, @title, @threadId)
          `);
      }
  
      await openai.beta.threads.messages.create(currentThreadId, {
        role: 'user',
        content: query,
      });
  
      const stream = await openai.beta.threads.runs.create(currentThreadId, {
        assistant_id: process.env.ASSISTANT_ID,
        stream: true,
      });
  
      let aiResponse = '';
      res.writeHead(200, { 
        'Content-Type': 'text/plain',
        'thread-id': currentThreadId 
    });
  
      for await (const chunk of stream) {
        if (chunk.event === 'thread.message.delta' && Array.isArray(chunk.data.delta.content)) {
          const contentArray = chunk.data.delta.content;
          const text = contentArray.map(item => item.text.value).join(''); // text.value değerini al
          aiResponse += text;
          res.write(text); // Anlık olarak istemciye yaz
        }
      }
      
      
      
  
      console.log("Tam yanıt alındı:", aiResponse);
  
      const pool = await mssql.connect();
      await pool.request()
        .input('userId', mssql.Int, userId)
        .input('query', mssql.NVarChar, query)
        .input('response', mssql.NVarChar, aiResponse)
        .input('threadId', mssql.NVarChar, currentThreadId)
        .query(`
          INSERT INTO ChatInteractions (UserId, Query, Response, ThreadId)
          VALUES (@userId, @query, @response, @threadId)
        `);
  
      res.end();
  
    } catch (err) {
      console.error('Sorgu sırasında hata oluştu:', err);
      res.status(500).json({ message: 'Sunucu hatası' });
    }
  });
  
  
  
router.get('/get-user-threads/:username', async (req, res) => {
    const { username } = req.params;
  
    try {
      const pool = await mssql.connect();
      const result = await pool.request()
        .input('username', mssql.NVarChar, username)
        .query(`
          SELECT t.Id, t.Title, t.CreatedAt, t.ThreadId
          FROM Threads t
          INNER JOIN Users u ON t.UserId = u.Id
          WHERE u.Username = @username
          ORDER BY t.CreatedAt DESC
        `);
  
      res.status(200).json(result.recordset);
    } catch (err) {
      console.error('Thread listeleme sırasında hata oluştu:', err);
      res.status(500).json({ message: 'Sunucu hatası' });
    }
  });
  

  router.get('/get-thread-messages/:threadId', async (req, res) => {
    const { threadId } = req.params;
  
    try {
      const pool = await mssql.connect();
      const result = await pool.request()
        .input('threadId', mssql.NVarChar, threadId)
        .query(`
          SELECT Query, Response, Timestamp
          FROM ChatInteractions
          WHERE ThreadId = @threadId
          ORDER BY Timestamp ASC
        `);
  console.log(result.recordset)
      res.status(200).json(result.recordset);
    } catch (err) {
      console.error('Mesajları alma sırasında hata oluştu:', err);
      res.status(500).json({ message: 'Sunucu hatası' });
    }
  });
  

module.exports = router;
