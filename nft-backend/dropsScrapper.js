const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

async function scrapeUpcomingDrops() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");

  console.log("🧭 Navigating to Drops page...");
  await page.goto("https://opensea.io/drops", {
    waitUntil: "domcontentloaded",
    timeout: 0,
  });

  // Wait for the main container
  await page.waitForSelector("main", { timeout: 15000 });
  console.log("✅ Main content loaded. Waiting for hydration...");

  // Wait longer for content to hydrate and render dynamically
  await new Promise(resolve => setTimeout(resolve, 12000)); // wait 12s

  const drops = await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll("h3, div[role='heading']"));
    const titles = new Set();

    headings.forEach(el => {
      const text = el.innerText?.trim();
      if (text && text.length > 3 && text.length < 100) {
        titles.add(text);
      }
    });

    return Array.from(titles);
  });

  console.log("🔍 Drops found:", drops);
  await browser.close();
  return drops;
}

module.exports = scrapeUpcomingDrops;