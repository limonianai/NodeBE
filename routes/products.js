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

    // Yeni URL - Kore sitesi
    const url = "https://www.oliveyoung.co.kr/store/main/getBestList.do?t_page=마스크팩%20%3E%20시트팩&t_click=GNB&t_gnb_type=랭킹&t_swiping_type=N";
    console.log(`▶ Sayfa açılıyor: ${url}`);
    await page.goto(url, { waitUntil: "domcontentloaded" });

    console.log("✅ Sayfa yüklendi.");
    console.log("▶ Sayfa biraz bekletiliyor ve JavaScript'in yüklenmesi bekleniyor...");
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log("▶ TabsConts container'ı bekleniyor...");
    await page.waitForSelector("#Container > div.best-area > div.TabsConts.on", { timeout: 20000 });
    console.log("✅ TabsConts container'ı bulundu.");

    console.log("▶ Tüm ul elementlerinin yüklenmesi bekleniyor...");
    
    // Tüm ul elementlerinin yüklenmesini bekle
    let previousUlCount = 0;
    let currentUlCount = 0;
    let waitAttempts = 0;
    const maxWaitAttempts = 15; // 15 * 2 = 30 saniye max bekleme

    do {
      previousUlCount = currentUlCount;
      
      // Mevcut ul sayısını kontrol et
      currentUlCount = await page.evaluate(() => {
        const container = document.querySelector("#Container > div.best-area > div.TabsConts.on");
        return container ? container.querySelectorAll("ul").length : 0;
      });
      
      console.log(`▶ Bekleme ${waitAttempts + 1}: ${currentUlCount} ul elementi bulundu`);
      
      if (currentUlCount < 10) { // 10 ul elementi bekliyoruz
        await new Promise(resolve => setTimeout(resolve, 2000));
        waitAttempts++;
      }
      
    } while (currentUlCount < 10 && waitAttempts < maxWaitAttempts);

    console.log(`✅ ${currentUlCount} ul elementi yüklendi.`);

    console.log("▶ Ürünler alınıyor...");

    const products = await page.evaluate(() => {
      // Doğru selector: ul.cate_prd_list içindeki tüm li elementleri
      const items = Array.from(document.querySelectorAll("ul.cate_prd_list li"));
      const baseUrl = "https://www.oliveyoung.co.kr";
      
      return items.map((item) => {
        // Sadece .prd_info içeren li'leri işle (gerçek ürünler)
        const productInfo = item.querySelector(".prd_info");
        if (!productInfo) return null;

        // Ürün adı - p.tx_name içindeki text
        const nameElement = item.querySelector("p.tx_name");
        const name = nameElement ? nameElement.innerText.trim() : "";
        
        // Marka adı - span.tx_brand
        const brandElement = item.querySelector("span.tx_brand");
        const brand = brandElement ? brandElement.innerText.trim() : "";
        
        // Tam ürün adı (marka + isim)
        const fullName = brand ? `${brand} ${name}` : name;

        // Fiyat - span.tx_cur içindeki span.tx_num
        const priceElement = item.querySelector(".tx_cur .tx_num");
        const price = priceElement ? priceElement.innerText.trim() + "원" : "";
        
        // Orijinal fiyat (varsa) - span.tx_org içindeki span.tx_num  
        const originalPriceElement = item.querySelector(".tx_org .tx_num");
        const originalPrice = originalPriceElement ? originalPriceElement.innerText.trim() + "원" : "";

        // Resim - img tag'ının src attribute'u
        const imageElement = item.querySelector("img");
        const image = imageElement ? imageElement.getAttribute("src") : "";

        // Link - a tag'ının href attribute'u (ilk a tag'ı)
        const linkElement = item.querySelector("a");
        const link = linkElement ? linkElement.getAttribute("href") : "";

        // Ürün numarası - data-ref-goodsno attribute'u
        const productNo = linkElement ? linkElement.getAttribute("data-ref-goodsno") : "";

        // Ranking - span.thumb_flag.best içindeki text (varsa)
        const rankElement = item.querySelector("span.thumb_flag.best");
        const rank = rankElement ? rankElement.innerText.trim() : "";

        return { 
          name: fullName || "İsim bulunamadı",
          brand: brand || "",
          price: price || "Fiyat bulunamadı", 
          originalPrice: originalPrice || "",
          image: image || "", 
          link: link || "",
          productNo: productNo || "",
          rank: rank || ""
        };
      })
      .filter(product => product !== null && product.name !== "İsim bulunamadı" && product.name.length > 0);
    });

    console.log(`✅ ${products.length} ürün bulundu.`);
    
    // Debug için ilk birkaç ürünü logla
    if (products.length > 0) {
      console.log("İlk ürün örneği:", products[0]);
    }

    await browser.close();
    res.json(products);
  } catch (err) {
    console.error("❌ Hata:", err.message);
    if (browser) await browser.close();
    res.status(500).json({ 
      error: "Scraping failed", 
      message: err.message,
      url: "https://www.oliveyoung.co.kr/store/main/getBestList.do?t_page=마스크팩%20%3E%20시트팩&t_click=GNB&t_gnb_type=랭킹&t_swiping_type=N"
    });
  }
});

module.exports = router;