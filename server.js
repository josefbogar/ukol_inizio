const express = require('express');
const puppeteer = require('puppeteer');
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

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    const googleURL = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
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
    console.error('Chyba při zpracování Puppeteer:', error);
    res.status(500).send('Chyba při zpracování dotazu.');
  }
});

// 4. Nastavení portu a hostitele
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server běží na adrese http://localhost:${PORT}`);
});


