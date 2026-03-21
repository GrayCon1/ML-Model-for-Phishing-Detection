console.log("Phishing Detector: Content script is alive and ready!");

const GMAIL_SUBJECT_SELECTOR = "h2.hP";

// --- THE UNIVERSAL SCRAPER HELPER ---
function scrapeEmailData() {
  const subjectEl = document.querySelector(GMAIL_SUBJECT_SELECTOR);
  let subjectText = '';

  if (subjectEl) {
    const clone = subjectEl.cloneNode(true);
    const injectedBtn = clone.querySelector('.phishing-detector-btn');
    if (injectedBtn) injectedBtn.remove();
    subjectText = clone.innerText.trim();
  }

  const bodyElement = document.querySelector(".a3s.aiL");
  let bodyText = '';

  if (bodyElement) {
    // 1. Create a "Phantom Clone" of the body to prevent reading our own banner!
    const bodyClone = bodyElement.cloneNode(true);
    const injectedBanner = bodyClone.querySelector('#native-security-banner');
    if (injectedBanner) injectedBanner.remove();

    bodyText = bodyClone.innerText.trim();

    // 2. Extract links from the clean clone
    const links = bodyClone.querySelectorAll('a');
    const extractedUrls = new Set();
    links.forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('http') && !bodyText.includes(href)) {
        extractedUrls.add(href);
      }
    });
    if (extractedUrls.size > 0) {
      bodyText += '\n\n--- Extracted Hidden Links ---\n' + Array.from(extractedUrls).join('\n');
    }
  }
  return { subject: subjectText, body: bodyText };
}

// --- LISTENER 1: FOR THE TOOLBAR POPUP ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "EXTRACT_EMAIL") {
    console.log("Phishing Detector: Toolbar popup requested data.");
    const data = scrapeEmailData();
    sendResponse(data);
  }
  return true;
});

// --- THE BUTTON INJECTION LOGIC (NATIVE UI) ---
function injectFloatingButton() {
  const subjectEl = document.querySelector(GMAIL_SUBJECT_SELECTOR);
  if (!subjectEl || document.querySelector('.phishing-detector-btn')) return;

  const btn = document.createElement('div');
  btn.className = 'phishing-detector-btn';
  btn.innerText = '🛡️ Scan Email';

  Object.assign(btn.style, {
    display: 'inline-flex', alignItems: 'center', marginLeft: '15px',
    backgroundColor: '#0ea5e9', color: '#0f172a', padding: '6px 12px',
    borderRadius: '9999px', fontWeight: 'bold', fontSize: '12px',
    cursor: 'pointer', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    userSelect: 'none', verticalAlign: 'middle', letterSpacing: '0.5px'
  });

  const trapEvent = (e) => {
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
  };

  btn.addEventListener('mousedown', trapEvent, true);
  btn.addEventListener('mouseup', trapEvent, true);

  // NOTICE THE 'async' KEYWORD HERE!
  btn.addEventListener('click', async (e) => {
    trapEvent(e);

    const emailBodyContainer = document.querySelector(".a3s.aiL");
    if (!emailBodyContainer) {
      console.error("Phishing Detector: Could not find email body.");
      return;
    }

    // --- TOGGLE LOGIC: UNDO THE SCAN ---
    if (emailBodyContainer.dataset.scanned === "true") {
      emailBodyContainer.innerHTML = emailBodyContainer.dataset.originalHtml;
      emailBodyContainer.dataset.scanned = "false";
      btn.innerText = '🛡️ Scan Email';

      const banner = document.getElementById('native-security-banner');
      if (banner) banner.remove();
      return;
    }

    // --- START THE SCAN ---
    btn.innerText = 'Scanning...';
    emailBodyContainer.dataset.scanned = "true";

    // Save the original HTML before we mutate it
    if (!emailBodyContainer.dataset.originalHtml) {
      emailBodyContainer.dataset.originalHtml = emailBodyContainer.innerHTML;
    }

    // The UX Fallback Timer (Just in case UptimeRobot missed a beat)
    const coldStartTimer = setTimeout(() => {
      btn.innerText = 'Waking up AI Engine... ⏳';
    }, 3000);

    try {
      const emailData = scrapeEmailData();

      // 1. FORMAT THE PAYLOAD FOR FASTAPI
      // Guarantee length > 0 and enforce max_lengths to satisfy Pydantic!
      const safeSubject = emailData.subject.substring(0, 250) || "(No Subject)";
      const safeBody = emailData.body.substring(0, 9900) || "(Empty Body)";

      const response = await fetch('https://ml-model-for-phishing-detection.onrender.com/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: safeSubject,
          body: safeBody
        })
      });

      clearTimeout(coldStartTimer);

      // If FastAPI still throws an error, log the EXACT reason so we can see it!
      if (!response.ok) {
        const errDetail = await response.json();
        console.error("FastAPI Error Detail:", errDetail);
        throw new Error(`Server returned ${response.status}`);
      }

      const aiResponse = await response.json();
      btn.innerText = 'Undo Scan';

      // 2. USE THE CORRECT PYTHON KEYS (top_signals)
      let currentHtml = emailBodyContainer.innerHTML;

      // Combine indicators and top_signals into one array to highlight them all
      const wordsToHighlight = [...(aiResponse.top_signals || []), ...(aiResponse.indicators || [])];

      if (wordsToHighlight.length > 0) {
        wordsToHighlight.forEach(word => {
          // Only highlight words longer than 2 letters to avoid highlighting "a" or "is"
          if (word.length > 2) {
            const safeRegex = new RegExp(`(?![^<]*>)(\\b${word}\\b)`, 'gi');
            currentHtml = currentHtml.replace(safeRegex, `<mark style="background-color: #fef08a; color: #854d0e; padding: 0 4px; border-radius: 4px; font-weight: bold;">$1</mark>`);
          }
        });
      }

      emailBodyContainer.innerHTML = currentHtml;

      // --- NEW: URL INTELLIGENCE DOM HIGHLIGHTING ---
      let linkFeedbackHtml = '';

      if (aiResponse.url_intelligence && aiResponse.url_intelligence.length > 0) {
        const allLinks = emailBodyContainer.querySelectorAll('a');
        const badUrls = aiResponse.url_intelligence.filter(u => u.is_suspicious);

        // 1. Visually paint the bad links inside the email text
        allLinks.forEach(link => {
          // Check if this link matches any of the bad URLs flagged by Python
          const isBad = badUrls.some(bad => link.href.includes(bad.url) || bad.url.includes(link.href));

          if (isBad) {
            link.style.backgroundColor = '#fecaca'; // Tailwind red-200
            link.style.color = '#991b1b'; // Tailwind red-800
            link.style.padding = '2px 4px';
            link.style.borderRadius = '4px';
            link.style.textDecoration = 'none';
            link.style.borderBottom = '2px solid #ef4444';
            link.innerHTML = link.innerHTML + ' 🚨'; // Add a warning icon right next to the link
          }
        });

        // 2. Generate the HTML report for the banner
        if (badUrls.length > 0) {
          linkFeedbackHtml = `
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #334155;">
              <strong style="color: #fca5a5;">⚠️ Suspicious Links Detected:</strong>
              <ul style="margin: 4px 0 0 0; padding-left: 20px; color: #f87171; font-size: 13px;">
                ${badUrls.map(u => `<li>${u.url} <br><i style="color: #cbd5e1;">Flags: ${u.flags.join(', ')}</i></li>`).join('')}
              </ul>
            </div>
          `;
        } else {
          linkFeedbackHtml = `
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #334155; font-size: 12px; color: #94a3b8;">
              ✅ Scanned ${aiResponse.url_intelligence.length} link(s). All appear safe.
            </div>
          `;
        }
      }

      // --- UPDATE BANNER WITH ACTUAL AI RISK SCORE & URL FEEDBACK ---
      const riskPercentage = Math.round((aiResponse.phishing_risk || 0) * 100);
      const isDangerous = aiResponse.label === "Likely Phishing";

      const summaryBanner = document.createElement('div');
      summaryBanner.id = 'native-security-banner';
      Object.assign(summaryBanner.style, {
        marginTop: '30px', padding: '16px', backgroundColor: '#0f172a',
        borderLeft: `4px solid ${isDangerous ? '#ef4444' : '#22c55e'}`,
        borderRadius: '8px', color: '#f8fafc', fontFamily: 'sans-serif',
        fontSize: '14px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      });

      summaryBanner.innerHTML = `
        <h3 style="margin: 0 0 8px 0; color: ${isDangerous ? '#ef4444' : '#22c55e'}; font-size: 16px; display: flex; align-items: center;">
          <span style="margin-right: 8px;">${isDangerous ? '🚨' : '✅'}</span> 
          AI Analysis: ${aiResponse.label}
        </h3>
        <p style="margin: 0; color: #cbd5e1; line-height: 1.5;">
          Our model calculated a <strong>${riskPercentage}% risk score</strong>. 
          ${wordsToHighlight.length > 0 ? "Suspicious signals have been highlighted in yellow above." : "No major suspicious keywords detected."}
        </p>
        ${linkFeedbackHtml} 
      `;
      // ^ Notice the ${linkFeedbackHtml} variable added right there!

      emailBodyContainer.appendChild(summaryBanner);

    } catch (error) {
      clearTimeout(coldStartTimer);
      console.error("Phishing Detector API Error:", error);
      btn.innerText = 'Scan Failed ❌';
      emailBodyContainer.dataset.scanned = "false";
    }

  }, true); // End of async click listener

  subjectEl.appendChild(btn);
}

const observer = new MutationObserver(() => injectFloatingButton());
observer.observe(document.body, { childList: true, subtree: true });