const express = require('express');
const puppeteer = require('puppeteer'); // Plná verze Puppeteer
const path = require('path');
const fs = require('fs'); // Modul pro práci se soubory

const app = express();

// 1. Servírování statických souborů ze složky "public"
app.use(express.static(path.join(__dirname, 'public')));

// 2. Route pro zobrazení HTML stránky na rootu "/"
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 3. Route pro zpracování vyhledávání
app.get('/search', async (req, res) => {
  const query = req.query.query;

  if (!query) {
    return res.send('Nebylo zadáno žádné hledané slovo (query).');
  }

  try {
    console.log(`Hledání výrazu: ${query}`);

    // Spuštění Puppeteer s novým headless režimem a potřebnými argumenty
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--single-process',
        '--no-zygote'
      ]
    });

    const page = await browser.newPage();
    const googleURL = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    console.log(`Navigace na URL: ${googleURL}`);
    await page.goto(googleURL, { waitUntil: 'networkidle2' });

    const results = await page.$$eval('div.g', divs => {
      return divs.map(div => {
        const headline = div.querySelector('h3')?.innerText || '';
        const link = div.querySelector('a')?.href || '';
        const snippet = div.querySelector('.VwiC3b')?.innerText || '';
        return { headline, link, snippet };
      });
    });

    await browser.close();

    console.log(`Nalezeno výsledků: ${results.length}`);
    fs.writeFileSync('vysledky.json', JSON.stringify(results, null, 2), 'utf8');

    res.json({
      hledanyVyraz: query,
      pocetNalezenych: results.length,
      vysledky: results
    });
  } catch (error) {
    console.error('Chyba Puppeteer:', error);
    res.status(500).send('Chyba při zpracování dotazu.');
  }
});

// 4. Nastavení portu, hostitele a timeoutů
const PORT = process.env.PORT || 10000;
const HOST = '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`Server běží na adrese http://${HOST}:${PORT}`);
});

// Přidání keepAliveTimeout a headersTimeout
server.keepAliveTimeout = 120 * 1000; // 120 sekund
server.headersTimeout = 120 * 1000; // 120 sekund

