const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs'); // modul pro práci se soubory v Node.js

const app = express();

// Servírování statických souborů ze složky "public"
app.use(express.static(path.join(__dirname, 'public')));

app.get('/search', async (req, res) => {
  // Čteme "query" z parametru URL ?query=...
  const query = req.query.query;

  if (!query) {
    return res.send('Nebylo zadáno žádné hledané slovo (query).');
  }

  try {
    // Spustíme Puppeteer s nastavením pro cloudové prostředí
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Požadovanou adresu Googlu sestavíme z query
    const googleURL = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    await page.goto(googleURL, { waitUntil: 'networkidle2' });

    // Selektor a extrakce výsledků
    const results = await page.$$eval('div.g', divs => {
      return divs.map(div => {
        const headline = div.querySelector('h3')?.innerText || '';
        const link = div.querySelector('a')?.href || '';
        const snippet = div.querySelector('.VwiC3b')?.innerText || '';
        return { headline, link, snippet };
      });
    });

    await browser.close();

    // Uložení výsledků do lokálního souboru vysledky.json
    fs.writeFileSync('vysledky.json', JSON.stringify(results, null, 2), 'utf8');

    // Pošleme JSON s výsledky i klientovi
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

// Dynamický port pro Render a hostitel
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Server běží na adrese http://${HOST}:${PORT}`);
});


