import { BrowserService } from "../browser.ts";
import dotenv from "dotenv";

dotenv.config();

describe("BrowserService", () => {
  let browserService: BrowserService;

  beforeAll(async () => {
    browserService = new BrowserService();
    await browserService.initialize();
  });

  afterAll(async () => {
    await browserService.closeBrowser();
  });

  test("should initialize and close browser", async () => {
    const newBrowserService = new BrowserService();
    await expect(newBrowserService.initialize()).resolves.not.toThrow();
    await expect(newBrowserService.closeBrowser()).resolves.not.toThrow();
  });

  test("should fetch content from a simple website", async () => {
    const content = await browserService.getPageContent("https://example.com");
    expect(content).toContain("Example Domain");
  }, 30000);

  test("should fetch content from a news website", async () => {
    const content = await browserService.getPageContent(
      "https://news.ycombinator.com",
    );
    expect(content).toContain("Hacker News");
  }, 30000);

  test("should handle a website with potential CAPTCHA (GitHub)", async () => {
    const content = await browserService.getPageContent("https://github.com");
    expect(content).toContain("GitHub");
  }, 60000);

  test("should fetch content from a website that might be blocked (Wikipedia)", async () => {
    const content = await browserService.getPageContent(
      "https://en.wikipedia.org/wiki/Main_Page",
    );
    expect(content).toContain("Wikipedia");
  }, 30000);

  test("should handle a 404 error and try alternative sources", async () => {
    const content = await browserService.getPageContent(
      "https://example.com/nonexistent-page",
    );
    expect(content).not.toBe("");
    expect(content).toContain("search"); // Expecting to fall back to a search result
  }, 60000);

  test("should handle network errors gracefully", async () => {
    await expect(
      browserService.getPageContent(
        "https://thisisaninvalidurlthatdoesnotexist.com",
      ),
    ).rejects.toThrow("Failed to fetch content from alternative sources");
  }, 60000);

  test("should block ads on ad-heavy website", async () => {
    const content = await browserService.getPageContent("https://www.cnn.com");
    expect(content).not.toContain("Advertisement");
  }, 60000);

  test("should handle a website with reCAPTCHA", async () => {
    const content = await browserService.getPageContent(
      "https://www.google.com/recaptcha/api2/demo",
    );
    expect(content).toContain("reCAPTCHA");
    // Note: Full CAPTCHA solving can't be reliably tested without manual intervention
  }, 60000);

  test("should handle a website with hCAPTCHA", async () => {
    const content = await browserService.getPageContent(
      "https://accounts.hcaptcha.com/demo",
    );
    expect(content).toContain("hCaptcha");
    // Note: Full CAPTCHA solving can't be reliably tested without manual intervention
  }, 60000);
});
