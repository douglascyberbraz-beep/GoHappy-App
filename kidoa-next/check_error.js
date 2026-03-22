const puppeteer = require('puppeteer');

(async () => {
    console.log("Starting Chrome...");
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
  
    page.on('console', msg => {
        if (msg.type() === 'error' || msg.type() === 'warning') {
            console.log(`[${msg.type().toUpperCase()}] ${msg.text()}`);
        }
    });

    page.on('pageerror', error => {
        console.log(`[PAGE FATAL ERROR] ${error.message}`);
    });

    console.log("Navigating to https://kidoa-next.vercel.app ...");
    await page.goto('https://kidoa-next.vercel.app', { waitUntil: 'networkidle2', timeout: 15000 });
    
    // Check if the application error boundary triggered
    const appErrorText = await page.evaluate(() => {
        return document.body.innerText;
    });

    if (appErrorText.includes("Application error")) {
        console.log("[REACT BOUNDARY TRIGGERED] Found Application Error on screen.");
        console.log("Text on screen:", appErrorText);
    } else {
        console.log("Site loaded successfully without application error boundary.");
    }

    await browser.close();
})();
