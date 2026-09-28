/**
 * On-Device Privacy Preserving Filter for Light-weight Browser Agents
 * ISRO Problem Statement SIH 26171
 */

class LocalPrivacyFilter {
  constructor() {
    this.piiPatterns = {
      email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      creditCard: /\b(?:\d[ -]*?){13,16}\b/g,
      phone: /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
      aadhaar: /\b\d{4}\s?\d{4}\s?\d{4}\b/g,
      pan: /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g
    };

    this.sensitiveSelectors = [
      'input[type="password"]',
      'input[autocomplete="cc-number"]',
      'input[autocomplete="cc-csc"]',
      'input[name*="pass"]',
      'input[name*="card"]',
      'input[name*="cvv"]',
      'input[name*="ssn"]',
      'input[name*="aadhaar"]',
      'input[name*="secret"]',
      '[data-sensitive="true"]'
    ];
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

  async redactScreenshot(dataUrl, regions = [], devicePixelRatio = 1) {
    return new Promise((resolve) => {
      if (!dataUrl) {
        resolve(null);
        return;
      }
      
      // Service worker safety check
      if (typeof Image === 'undefined' || typeof document === 'undefined') {
        resolve(dataUrl);
        return;
      }

      try {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width || 800;
            canvas.height = img.height || 600;
            const ctx = canvas.getContext('2d');

            ctx.drawImage(img, 0, 0);

            (regions || []).forEach((region) => {
              const rx = (region.x || 0) * devicePixelRatio;
              const ry = (region.y || 0) * devicePixelRatio;
              const rw = (region.width || 100) * devicePixelRatio;
              const rh = (region.height || 30) * devicePixelRatio;

              ctx.fillStyle = '#0f172a';
              ctx.fillRect(rx, ry, rw, rh);

              ctx.strokeStyle = '#ef4444';
              ctx.lineWidth = 2 * devicePixelRatio;
              ctx.strokeRect(rx, ry, rw, rh);

              ctx.fillStyle = '#ffffff';
              ctx.font = `bold ${Math.max(10, 12 * devicePixelRatio)}px sans-serif`;
              ctx.fillText(`🔒 [REDACTED: ${region.label || 'PII'}]`, rx + 4, ry + Math.min(rh / 1.5, 16 * devicePixelRatio));
            });

            resolve(canvas.toDataURL('image/jpeg', 0.85));
          } catch (err) {
            console.error('Redaction error:', err);
            resolve(dataUrl);
          }
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
      } catch (e) {
        resolve(dataUrl);
      }
    });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = LocalPrivacyFilter;
}
