const express = require("express");
const router = express.Router();
const axios = require("axios");

// dış scraping sunucunun IP adresi (değiştir)
const SCRAPER_URL = "http://212.24.104.167:5005/oliveyoung";

router.get("/oliveyoung", async (req, res) => {
  try {
    console.log(`▶ Scraper sunucusuna istek gönderiliyor: ${SCRAPER_URL}`);
    const response = await axios.get(SCRAPER_URL);
    res.json(response.data);
  } catch (err) {
    console.error("❌ Scraper sunucusuna erişilemedi:", err.message);
    res.status(500).json({
      error: "Proxy error",
      message: "Scraper microservice erişilemiyor.",
      detail: err.message
    });
  }
});

module.exports = router;
