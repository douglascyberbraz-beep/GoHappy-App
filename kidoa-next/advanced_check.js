const puppeteer = require('puppeteer');

(async () => {
    console.log("Starting Chrome with mobile emulation...");
    const browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    
    // Emulate a mobile device
    const iPhone = puppeteer.KnownDevices['iPhone 13'];
    await page.emulate(iPhone);

    page.on('console', msg => {
        console.log(`[CONSOLE ${msg.type().toUpperCase()}] ${msg.text()}`);
    });

    page.on('pageerror', error => {
        console.log(`[PAGE ERROR] ${error.message}`);
    });

    page.on('requestfailed', request => {
        console.log(`[REQUEST FAILED] ${request.url()} - ${request.failure()?.errorText}`);
    });

    console.log("Navigating to https://kidoa-next.vercel.app ...");
    
    try {
        await page.goto('https://kidoa-next.vercel.app', { waitUntil: 'networkidle0', timeout: 25000 });
        
        // Wait a bit to ensure Client components hydrate fully
        await new Promise(resolve => setTimeout(resolve, 5000));

        const bodyHtml = await page.evaluate(() => document.body.innerHTML);
        
        if (bodyHtml.includes("Application error")) {
            console.log("❌ [STILL FAILING] Found Application Error on screen.");
            // Dump the exact container text that has the error
            const errorText = await page.evaluate(() => {
                const errDiv = document.querySelector('body > div');
                return errDiv ? errDiv.innerText : 'Unknown Error text';
            });
            console.log("Error Box Text:", errorText);
        } else {
            console.log("✅ [SUCCESS] Site loaded completely without application error boundary.");
            console.log("Body begins with:", bodyHtml.substring(0, 200));
        }

        await page.screenshot({ path: 'vercel_live_screenshot.png' });
        console.log("Screenshot saved as vercel_live_screenshot.png");

    } catch (e) {
        console.log("Navigation or JS Execution failed:", e);
    }

    await browser.close();
})();
