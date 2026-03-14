const extensionApi = globalThis.chrome

console.log('Phishing Detector: Content script is alive and ready!')

if (extensionApi?.runtime?.onMessage) {
  extensionApi.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'EXTRACT_EMAIL') {
      console.log('Phishing Detector: Extract message received from popup.')

      try {
        // Scrape the subject line from Gmail's message view.
        const subjectElement = document.querySelector('h2.hP')
        const subjectText = subjectElement ? subjectElement.innerText.trim() : ''

        // Scrape the visible email body content.
        const bodyElement = document.querySelector('.a3s.aiL')
        let bodyText = bodyElement ? bodyElement.innerText.trim() : ''

        console.log('Phishing Detector: Found body element?', !!bodyElement)

        // Include hidden links so the analyzer can inspect URLs not shown in plain text.
        if (bodyElement) {
          const links = bodyElement.querySelectorAll('a')
          const extractedUrls = new Set()

          links.forEach((link) => {
            const href = link.getAttribute('href')
            if (href && href.startsWith('http') && !bodyText.includes(href)) {
              extractedUrls.add(href)
            }
          })

          if (extractedUrls.size > 0) {
            bodyText += '\n\n--- Extracted Hidden Links ---\n'
            bodyText += Array.from(extractedUrls).join('\n')
            console.log(
              `Phishing Detector: Found ${extractedUrls.size} hidden links.`,
            )
          }
        }

        console.log('Phishing Detector: Sending data back to popup...')
        sendResponse({ subject: subjectText, body: bodyText })
      } catch (error) {
        console.error('Phishing Detector: Extraction failed!', error)
        sendResponse({ subject: '', body: '' })
      }
    }

    return true
  })
}