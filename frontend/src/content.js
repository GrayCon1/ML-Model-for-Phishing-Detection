console.log("Phishing Detector: Content script is alive and ready!");

// Our dictionary of email providers and their specific CSS selectors
const PROVIDER_SELECTORS = {
  "mail.google.com": {
    subject: "h2.hP",
    body: ".a3s.aiL"
  },
  "outlook.live.com": {
    // Look for accessibility headings, message headers, and spans with titles
    subject: "[role='heading'] span[title], [aria-label^='Message header'] span, div[role='heading'], .subject",
    body: "[aria-label='Message body'], .BodyFragment"
  },
  "outlook.office.com": {
    subject: "[role='heading'] span[title], [aria-label^='Message header'] span, div[role='heading'], .subject",
    body: "[aria-label='Message body'], .BodyFragment"
  },
  "mail.yahoo.com": {
    subject: "[data-test-id='message-subject']",
    body: "[data-test-id='message-view-body']"
  }
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "EXTRACT_EMAIL") {
    console.log("Phishing Detector: Extract message received.");

    try {
      const hostname = window.location.hostname;
      let selectors = null;

      for (const domain in PROVIDER_SELECTORS) {
        if (hostname.includes(domain)) {
          selectors = PROVIDER_SELECTORS[domain];
          break;
        }
      }

      if (!selectors) {
        sendResponse({ subject: "", body: "" });
        return true;
      }

      // --- 1. THE SMART SUBJECT SCRAPER ---
      // --- 1. THE SMART SUBJECT SCRAPER ---
      let subjectText = '';

      // Grab ALL elements on the page that match our possible subject selectors
      const possibleSubjects = document.querySelectorAll(selectors.subject);

      for (const el of possibleSubjects) {
        const text = el.innerText.trim();

        // Ignore generic UI elements Microsoft accidentally tags as headings
        if (text && text !== "Navigation pane" && text !== "Mail" && !text.includes("folders")) {
          subjectText = text;
          break; // We found the real subject! Stop looking.
        }
      }

      // The fallback just in case it's opened in a new window
      if (!subjectText) {
        const fullTitle = document.title;
        const titleHack = fullTitle.split(' - ')[0].split(' | ')[0].trim();
        if (titleHack !== "Mail") subjectText = titleHack;
      }

      // --- 2. SCRAPE THE BODY ---
      const bodyElement = document.querySelector(selectors.body);
      let bodyText = bodyElement ? bodyElement.innerText.trim() : '';

      // --- 3. THE URL HUNTER ---
      if (bodyElement) {
        const links = bodyElement.querySelectorAll('a');
        const extractedUrls = new Set();

        links.forEach(link => {
          const href = link.getAttribute('href');
          if (href && href.startsWith('http') && !bodyText.includes(href)) {
            extractedUrls.add(href);
          }
        });

        if (extractedUrls.size > 0) {
          bodyText += '\n\n--- Extracted Hidden Links ---\n';
          bodyText += Array.from(extractedUrls).join('\n');
        }
      }

      sendResponse({ subject: subjectText, body: bodyText });

    } catch (error) {
      console.error("Phishing Detector: Extraction failed!", error);
      sendResponse({ subject: "", body: "" });
    }
  }
  return true;
});