const express = require("express");
const router = express.Router();
const axios = require("axios");

// Scraper microservice URL'leri
const SCRAPER_BASE_URL = "http://212.24.104.167:5005";
const OLIVEYOUNG_URL = `${SCRAPER_BASE_URL}/oliveyoung`;
const NAVER_URL = `${SCRAPER_BASE_URL}/naver`;

// Olive Young endpoint (mevcut)
router.get("/oliveyoung", async (req, res) => {
  try {
    console.log(`▶ OliveYoung scraper'a istek gönderiliyor: ${OLIVEYOUNG_URL}`);
    const response = await axios.get(OLIVEYOUNG_URL);
    res.json(response.data);
  } catch (err) {
    console.error("❌ OliveYoung scraper'a erişilemedi:", err.message);
    res.status(500).json({
      error: "Proxy error",
      message: "OliveYoung scraper microservice erişilemiyor.",
      detail: err.message
    });
  }
});

// Naver Shopping endpoint (yeni)
router.get("/naver", async (req, res) => {
  try {
    console.log(`▶ Naver scraper'a istek gönderiliyor: ${NAVER_URL}`);
    const response = await axios.get(NAVER_URL, {
      timeout: 30000 // 30 saniye timeout - Naver yavaş olabilir
    });
    res.json(response.data);
  } catch (err) {
    console.error("❌ Naver scraper'a erişilemedi:", err.message);
    res.status(500).json({
      error: "Proxy error", 
      message: "Naver scraper microservice erişilemiyor.",
      detail: err.message
    });
  }
});

// Tüm sitelerin verilerini toplayan endpoint (bonus)
router.get("/all", async (req, res) => {
  try {
    console.log("▶ Tüm scraper'lardan veri toplanıyor...");
    
    const promises = [
      axios.get(OLIVEYOUNG_URL).catch(err => ({ error: "OliveYoung başarısız", detail: err.message })),
      axios.get(NAVER_URL).catch(err => ({ error: "Naver başarısız", detail: err.message }))
    ];

    const results = await Promise.all(promises);
    
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      sources: {
        oliveyoung: results[0].data || results[0],
        naver: results[1].data || results[1]
      },
      summary: {
        totalProducts: 0,
        totalSources: 0
      }
    };

    // Başarılı sonuçları say
    if (results[0].data && results[0].data.success) {
      response.summary.totalProducts += results[0].data.count || 0;
      response.summary.totalSources += 1;
    }
    
    if (results[1].data && results[1].data.success) {
      response.summary.totalProducts += results[1].data.count || 0;
      response.summary.totalSources += 1;
    }

    res.json(response);
  } catch (err) {
    console.error("❌ Toplu veri toplama hatası:", err.message);
    res.status(500).json({
      error: "Multiple scraper error",
      message: "Scraper'lardan veri toplanamadı.",
      detail: err.message
    });
  }
});

module.exports = router;