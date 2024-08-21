import { PlaywrightBlocker } from '@cliqz/adblocker-playwright';
import fetch from 'cross-fetch';
import { Browser, BrowserContext, chromium, Page } from 'playwright';
import CaptchaSolver from 'capsolver-npm';

export class BrowserService {
  private browser: Browser | undefined;
  private context: BrowserContext | undefined;
  private blocker: PlaywrightBlocker | undefined;
  private captchaSolver: CaptchaSolver;

  constructor() {
    this.browser = undefined;
    this.context = undefined;
    this.blocker = undefined;
    this.captchaSolver = new CaptchaSolver(process.env.CAPSOLVER_API_KEY || '');
  }

  async initialize() {
    if (!this.browser) {
      this.browser = await chromium.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      this.context = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      });

      this.blocker = await PlaywrightBlocker.fromPrebuiltAdsAndTracking(fetch);
    }
  }

  async closeBrowser() {
    if (this.context) {
      await this.context.close();
      this.context = undefined;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = undefined;
    }
  }

  async getPageContent(url: string): Promise<string> {
    let page: Page | undefined;

    try {
      if (!this.context) {
        throw new Error("Browser context not initialized. Call initialize() first.");
      }

      page = await this.context.newPage();

      // Enable stealth mode
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
      });

      // Apply ad blocker
      if (this.blocker) {
        await this.blocker.enableBlockingInPage(page);
      }

      const response = await page.goto(url, { waitUntil: 'networkidle' });

      if (!response) {
        throw new Error('Failed to load the page');
      }

      if (response.status() === 403 || response.status() === 404) {
        return await this.tryAlternativeSources(url);
      }

      // Check for CAPTCHA
      const captchaDetected = await this.detectCaptcha(page);
      if (captchaDetected) {
        await this.solveCaptcha(page, url);
      }

      const bodyContent = await page.evaluate(() => document.body.innerText);
      return bodyContent;
    } catch (error) {
      console.error("Error:", error);
      throw error;
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  private async detectCaptcha(page: Page): Promise<boolean> {
    const captchaSelectors = [
      'iframe[src*="captcha"]',
      'div[class*="captcha"]',
      '#captcha',
      '.g-recaptcha',
      '.h-captcha'
    ];

    for (const selector of captchaSelectors) {
      const element = await page.$(selector);
      if (element) return true;
    }

    return false;
  }

  private async solveCaptcha(page: Page, url: string): Promise<void> {
    try {
      const hcaptchaKey = await this.getHCaptchaWebsiteKey(page);
      if (hcaptchaKey) {
        const solution = await this.captchaSolver.hcaptchaProxyless({
          websiteURL: url,
          websiteKey: hcaptchaKey
        });
        await page.evaluate((token) => {
          // @ts-ignore
          window.hcaptcha.setResponse(token);
        }, solution.gRecaptchaResponse);
        return;
      }

      const recaptchaKey = await this.getReCaptchaWebsiteKey(page);
      if (recaptchaKey) {
        const solution = await this.captchaSolver.recaptchaV2Proxyless({
          websiteURL: url,
          websiteKey: recaptchaKey
        });
        await page.evaluate((token) => {
          // @ts-ignore
          document.getElementById('g-recaptcha-response').innerHTML = token;
        }, solution.gRecaptchaResponse);
      }
    } catch (error) {
      console.error("Error solving CAPTCHA:", error);
    }
  }

  private async getHCaptchaWebsiteKey(page: Page): Promise<string> {
    return page.evaluate(() => {
      const hcaptchaIframe = document.querySelector('iframe[src*="hcaptcha.com"]');
      if (hcaptchaIframe) {
        const src = hcaptchaIframe.getAttribute('src');
        const match = src?.match(/sitekey=([^&]*)/);
        return match ? match[1] : '';
      }
      return '';
    });
  }

  private async getReCaptchaWebsiteKey(page: Page): Promise<string> {
    return page.evaluate(() => {
      const recaptchaElement = document.querySelector('.g-recaptcha');
      return recaptchaElement ? recaptchaElement.getAttribute('data-sitekey') || '' : '';
    });
  }

  private async tryAlternativeSources(url: string): Promise<string> {
    // Try Internet Archive
    const archiveUrl = `https://web.archive.org/web/${url}`;
    try {
      return await this.getPageContent(archiveUrl);
    } catch (error) {
      console.error("Error fetching from Internet Archive:", error);
    }

    // Try Google Search as a last resort
    const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
    try {
      return await this.getPageContent(googleSearchUrl);
    } catch (error) {
      console.error("Error fetching from Google Search:", error);
      throw new Error("Failed to fetch content from alternative sources");
    }
  }
}