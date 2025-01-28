const express = require('express');
const puppeteer = require('puppeteer'); // Používáme plnou verzi Puppeteer
const path = require('path');
const fs = require('fs'); // Modul pro práci se soubory

const app = express();

console.log('Spouštím aplikaci...');

// 1. Servírování statických souborů ze složky "public"
app.use(express.static(path.join(__dirname, 'public')));

// 2. Route pro zobrazení HTML stránky na rootu "/"
app.get('/', (req, res) => {
  console.log('🔵 Servíruji hlavní stránku.');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 3. Route pro zpracování vyhledávání
app.get('/search', async (req, res) => {
  const query = req.query.query;

  if (!query) {
    console.log('🟠 Nebylo zadáno žádné hledané slovo.');
    return res.send('Nebylo zadáno žádné hledané slovo (query).');
  }

  try {
    console.log(`🟡 Hledání výrazu: ${query}`);

    // Spuštění Puppeteer
    console.log('🟡 Spouštím Puppeteer...');
    const browser = await puppeteer.launch({
      headless: false,  // PRO LOKÁLNÍ LADĚNÍ: abychom viděli, co se děje
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--single-process',
        '--no-zygote'
      ]
    });
    console.log('🟢 Puppeteer byl úspěšně spuštěn.');

    const page = await browser.newPage();
    
    // Nastavíme user agent, aby Google nepanikařil
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
      'AppleWebKit/537.36 (KHTML, like Gecko) ' +
      'Chrome/87.0.4280.66 Safari/537.36'
    );

    const googleURL = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    console.log(`🟡 Navigace na URL: ${googleURL}`);

    await page.goto(googleURL, { waitUntil: 'networkidle2' });

    // Počkáme, až se objeví div.tF2Cxc (třída používaná pro výsledky)
    await page.waitForSelector('div.tF2Cxc', { timeout: 60000 });
    
    // Dáme ještě malou prodlevu, aby se domalovaly snippet texty
    await new Promise(resolve => setTimeout(resolve, 2000));

    const results = await page.$$eval('div.tF2Cxc', (divs) => {
      return divs.map(div => {
        const headline = div.querySelector('h3')?.innerText.trim() || '';
        const link = div.querySelector('a')?.href || '';
        // snippet se často skrývá v jedné z těchto tříd
        const snippetElement = div.querySelector('.aCOpRe, .IsZvec, .VwiC3b');
        const snippet = snippetElement ? snippetElement.innerText.trim() : '';
        return { headline, link, snippet };
      });
    });

    await browser.close();
    console.log(`🟢 Nalezeno výsledků: ${results.length}`);

    fs.writeFileSync('vysledky.json', JSON.stringify(results, null, 2), 'utf8');
    res.json({
      hledanyVyraz: query,
      pocetNalezenych: results.length,
      vysledky: results
    });
  } catch (error) {
    console.error('🔴 Chyba při zpracování Puppeteer:', error);
    res.status(500).send('Chyba při zpracování dotazu.');
  }
});

// 4. Nastavení portu, hostitele a timeoutů
const PORT = process.env.PORT || 3000; // Render nastaví PORT automaticky
const HOST = '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`✅ Server běží na adrese http://${HOST}:${PORT}`);
});

// Zvýšení timeoutů pro cloudové prostředí
server.keepAliveTimeout = 120 * 1000; // 120 sekund
server.headersTimeout = 120 * 1000;   // 120 sekund
