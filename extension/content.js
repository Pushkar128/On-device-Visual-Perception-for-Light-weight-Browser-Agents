/**
 * Content Script - ISRO On-Device Privacy Preserving Browser Agent
 */

if (!window.LocalPrivacyFilter) {
  window.LocalPrivacyFilter = class LocalPrivacyFilter {
    constructor() {
      this.piiPatterns = {
        email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        creditCard: /\b(?:\d[ -]*?){13,16}\b/g,
        phone: /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
        aadhaar: /\b\d{4}\s?\d{4}\s?\d{4}\b/g,
        pan: /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g
      };
    }

    scanDOMForSensitiveRegions() {
      const sensitiveRegions = [];
      const elements = document.querySelectorAll('*');

      elements.forEach((el) => {
        let isSensitive = false;
        let label = 'PII_DATA';

        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          const type = (el.getAttribute('type') || '').toLowerCase();
          const name = (el.getAttribute('name') || '').toLowerCase();
          const id = (el.getAttribute('id') || '').toLowerCase();
          const autocomplete = (el.getAttribute('autocomplete') || '').toLowerCase();

          if (type === 'password' || name.includes('pass') || id.includes('pass')) {
            isSensitive = true;
            label = 'PASSWORD_FIELD';
          } else if (autocomplete.includes('cc') || name.includes('card') || name.includes('cvv')) {
            isSensitive = true;
            label = 'PAYMENT_CREDENTIALS';
          } else if (name.includes('ssn') || name.includes('aadhaar') || name.includes('pan')) {
            isSensitive = true;
            label = 'GOVT_ID';
          }
        }

        if (!isSensitive && el.children.length === 0 && el.textContent) {
          const text = el.textContent;
          for (const [key, pattern] of Object.entries(this.piiPatterns)) {
            if (pattern.test(text)) {
              isSensitive = true;
              label = key.toUpperCase();
              break;
            }
          }
        }

        if (isSensitive) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            sensitiveRegions.push({
              x: Math.round(rect.left + window.scrollX),
              y: Math.round(rect.top + window.scrollY),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              label: label
            });
          }
        }
      });

      return sensitiveRegions;
    }
  };
}

let activePiiFilter = null;
function getPiiFilter() {
  if (!activePiiFilter) {
    activePiiFilter = new window.LocalPrivacyFilter();
  }
  return activePiiFilter;
}

// Listen for background requests
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'SCAN_DOM_PII') {
    const startTime = performance.now();
    const sensitiveRegions = getPiiFilter().scanDOMForSensitiveRegions();
    const endTime = performance.now();

    sendResponse({
      status: 'SUCCESS',
      regions: sensitiveRegions,
      dpr: window.devicePixelRatio || 1,
      scanTimeMs: Math.round(endTime - startTime)
    });
    return true;
  }

  if (request.action === 'EXECUTE_AGENT_COMMAND') {
    const cmd = request.command;
    console.log('[ISRO Privacy Agent] Executing command:', cmd);

    try {
      if (cmd.type === 'click') {
        let el = null;
        if (cmd.selector) {
          el = document.querySelector(cmd.selector);
        }
        if (!el && cmd.x && cmd.y) {
          el = document.elementFromPoint(cmd.x, cmd.y);
        }

        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.click();
          sendResponse({ status: 'EXECUTED', detail: `Clicked element ${el.tagName}` });
        } else {
          sendResponse({ status: 'FAILED', detail: 'Element not found at coordinates/selector' });
        }
      } else if (cmd.type === 'type') {
        const el = document.querySelector(cmd.selector) || document.activeElement;
        if (el) {
          el.value = cmd.text;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          sendResponse({ status: 'EXECUTED', detail: `Typed into ${el.tagName}` });
        } else {
          sendResponse({ status: 'FAILED', detail: 'Target input field not found' });
        }
      } else if (cmd.type === 'scroll') {
        window.scrollBy({ top: cmd.deltaY || 300, behavior: 'smooth' });
        sendResponse({ status: 'EXECUTED', detail: 'Scrolled page' });
      }
    } catch (err) {
      sendResponse({ status: 'ERROR', error: err.toString() });
    }
    return true;
  }
});
