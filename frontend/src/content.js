console.log("Phishing Detector: Content script is alive and ready!");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "EXTRACT_EMAIL") {
        console.log("Phishing Detector: Extract message received from popup.");

        try {
            // 1. Scrape the Subject
            const subjectElement = document.querySelector('h2.hP');
            const subjectText = subjectElement ? subjectElement.innerText.trim() : '';

            // 2. Scrape the Body
            const bodyElement = document.querySelector('.a3s.aiL');
            let bodyText = bodyElement ? bodyElement.innerText.trim() : '';

            console.log("Phishing Detector: Found body element?", !!bodyElement);

            // 3. The URL Hunter
            if (bodyElement) {
                const links = bodyElement.querySelectorAll('a');
                const extractedUrls = new Set();

                links.forEach(link => {
                    // getAttribute ALWAYS returns a string or null, bypassing all SVG/object issues!
                    const href = link.getAttribute('href');
                    if (href && href.startsWith('http') && !bodyText.includes(href)) {
                        extractedUrls.add(href);
                    }
                });

                if (extractedUrls.size > 0) {
                    bodyText += '\n\n--- Extracted Hidden Links ---\n';
                    bodyText += Array.from(extractedUrls).join('\n');
                    console.log(`Phishing Detector: Found ${extractedUrls.size} hidden links.`);
                }
            }

            console.log("Phishing Detector: Sending data back to popup...");
            sendResponse({ subject: subjectText, body: bodyText });

        } catch (error) {
            console.error("Phishing Detector: Extraction failed!", error);
            sendResponse({ subject: "", body: "" }); // Send empty strings so React doesn't crash
        }
    }
    return true;
});