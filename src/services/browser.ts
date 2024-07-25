import { chromium, Browser, Page } from 'playwright';

export class BrowserService {
  private browser: Browser | undefined;

  constructor() {
    this.browser = undefined;
  }

  async initialize() {
    if (!this.browser) {
      this.browser = await chromium.launch();
    }
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = undefined;
    }
  }

  async getPageContent(url: string): Promise<string> {
    let page: Page | undefined;

    try {
      if (!this.browser) {
        throw new Error('Browser not initialized. Call initializeBrowser() first.');
      }

      page = await this.browser.newPage();
      await page.goto(url);

      const bodyContent = await page.evaluate(() => document.body.innerText);
      return bodyContent;
    } catch (error) {
      console.error('Error:', error);
      throw error;
    } finally {
      if (page) {
        await page.close();
      }
    }
  }
}