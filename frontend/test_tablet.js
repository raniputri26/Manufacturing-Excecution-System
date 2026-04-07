const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ 
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: { width: 768, height: 1024, isMobile: true, hasTouch: true }
    });
    
    try {
        const page = await browser.newPage();
        
        // Dashboard
        await page.goto('http://localhost:5174/', { waitUntil: 'networkidle0' });
        await page.screenshot({ path: 'public/screenshot_dashboard_tablet.png', fullPage: false });
        
        // Master Data
        await page.goto('http://localhost:5174/master', { waitUntil: 'networkidle0' });
        await page.screenshot({ path: 'public/screenshot_master_tablet.png', fullPage: false });
        
        // Scanner
        await page.goto('http://localhost:5174/scan', { waitUntil: 'networkidle0' });
        await page.screenshot({ path: 'public/screenshot_scanner_tablet.png', fullPage: false });

    } catch(e) {
        console.error(e);
    } finally {
        await browser.close();
    }
})();
