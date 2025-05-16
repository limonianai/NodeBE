const express = require("express");
const router = express.Router();
const puppeteer = require("puppeteer");

router.get("/oliveyoung", async (req, res) => {
  console.log("▶ Puppeteer başlatılıyor...");
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      slowMo: 50,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
    );

    const url = "https://global.oliveyoung.com/display/page/best-seller?target=pillsTab1Nav2";
    console.log(`▶ Sayfa açılıyor: ${url}`);
    await page.goto(url, { waitUntil: "domcontentloaded" });

    console.log("✅ Sayfa yüklendi.");
    console.log("▶ Sayfa biraz bekletiliyor...");
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log("▶ Ürün elementi bekleniyor...");
    await page.waitForSelector("li.order-best-product", { timeout: 20000 });

    console.log("✅ Ürün elementi bulundu. Ürünler alınıyor...");

    const products = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll("li.order-best-product"));
      const baseUrl = "https://global.oliveyoung.com";
      return items.map((item) => {
        const name = item.querySelector("input[name='prdtName']")?.value.trim();
        const price = item.querySelector(".price-info strong")?.innerText.trim();
        const imageTag = item.querySelector("img");
        const image = imageTag?.getAttribute("data-src") || imageTag?.src;
        const linkTag = item.querySelector("a");
        const link = linkTag ? baseUrl + linkTag.getAttribute("href") : "";
        return { name, price, image, link };
      });
    });

    console.log(`✅ ${products.length} ürün bulundu.`);
    await browser.close();
    res.json(products);
  } catch (err) {
    console.error("❌ Hata:", err.message);
    if (browser) await browser.close();
    res.status(500).json({ error: "Scraping failed" });
  }
});

module.exports = router;
