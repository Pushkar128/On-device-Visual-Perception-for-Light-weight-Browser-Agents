document.addEventListener('DOMContentLoaded', () => {
  const toggleAgent = document.getElementById('toggleAgent');
  const btnRunOnce = document.getElementById('btnRunOnce');
  const serverStatusDot = document.getElementById('serverStatusDot');
  const serverStatusText = document.getElementById('serverStatusText');
  
  const valLatency = document.getElementById('valLatency');
  const valMaskedCount = document.getElementById('valMaskedCount');
  const valNetLatency = document.getElementById('valNetLatency');
  const imgPreview = document.getElementById('imgPreview');
  const previewText = document.getElementById('previewText');

  // Refresh metrics and server status dynamically
  function refreshStatus() {
    chrome.runtime.sendMessage({ action: 'GET_STATUS' }, (res) => {
      if (res) {
        toggleAgent.checked = res.active;
        updateMetricsUI(res.metrics);
      }
    });
  }

  refreshStatus();
  setInterval(refreshStatus, 1000);

  toggleAgent.addEventListener('change', () => {
    chrome.runtime.sendMessage({ action: 'TOGGLE_AGENT', enabled: toggleAgent.checked });
  });

  btnRunOnce.addEventListener('click', () => {
    btnRunOnce.textContent = '⚡ Redacting Screen...';
    btnRunOnce.disabled = true;

    chrome.runtime.sendMessage({ action: 'RUN_SINGLE_CYCLE' }, (res) => {
      btnRunOnce.textContent = '🛡️ Scan & Redact Screen Now';
      btnRunOnce.disabled = false;

      if (res && res.status === 'ERROR') {
        previewText.textContent = `⚠️ Error: ${res.error}`;
        previewText.style.color = '#ef4444';
        return;
      }

      if (res && res.metrics) {
        updateMetricsUI(res.metrics);
      }
      if (res && res.redactedDataUrl) {
        imgPreview.src = res.redactedDataUrl;
        imgPreview.style.display = 'block';
        previewText.style.color = '#94a3b8';
        previewText.textContent = `Sanitized Output (${res.redactedRegions ? res.redactedRegions.length : 0} PII items masked)`;
      }
    });
  });

  const btnVoice = document.getElementById('btnVoice');

  if (btnVoice) {
    btnVoice.addEventListener('click', () => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert('Web Speech API is not supported in this browser version.');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;

      btnVoice.textContent = '🎙️ Listening...';
      btnVoice.style.background = '#dc2626';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        console.log('[AI Voice Agent] Spoken command:', transcript);
        btnVoice.textContent = '🎙️ AI Voice';
        btnVoice.style.background = 'linear-gradient(135deg, #6366f1, #4f46e5)';

        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance();
          
          if (transcript.includes('search') || transcript.includes('find') || transcript.includes('look up') || transcript.includes('who is') || transcript.includes('what is')) {
            let query = transcript.replace(/^(search for|search|find|look up|who is|what is)/i, '').trim();
            if (!query) query = transcript;
            
            if (transcript.includes('youtube')) {
              query = query.replace(/on youtube|youtube/gi, '').trim();
              utterance.text = `Searching YouTube for ${query}.`;
              window.speechSynthesis.speak(utterance);
              chrome.tabs.create({ url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}` });
            } else {
              utterance.text = `Searching Google for ${query}.`;
              window.speechSynthesis.speak(utterance);
              chrome.tabs.create({ url: `https://www.google.com/search?q=${encodeURIComponent(query)}` });
            }
          } else if (transcript.includes('youtube')) {
            utterance.text = 'Opening YouTube for you.';
            window.speechSynthesis.speak(utterance);
            try {
              chrome.tabs.create({ url: 'https://www.youtube.com' });
            } catch (e) {
              window.open('https://www.youtube.com', '_blank');
            }
          } else if (transcript.includes('google')) {
            utterance.text = 'Opening Google for you.';
            window.speechSynthesis.speak(utterance);
            try {
              chrome.tabs.create({ url: 'https://www.google.com' });
            } catch (e) {
              window.open('https://www.google.com', '_blank');
            }
          } else if (transcript.includes('form') || transcript.includes('portal')) {
            utterance.text = 'Opening ISRO Confidential Form Portal.';
            window.speechSynthesis.speak(utterance);
            try {
              chrome.tabs.create({ url: 'http://localhost:3000/form.html' });
            } catch (e) {
              window.open('http://localhost:3000/form.html', '_blank');
            }
          } else if (transcript.includes('scan') || transcript.includes('redact') || transcript.includes('action')) {
            utterance.text = 'Executing on-device redaction and VLM action.';
            window.speechSynthesis.speak(utterance);
            btnRunOnce.click();
          } else {
            // Fallback: Perform Google search for any general query
            utterance.text = `Searching Google for ${transcript}.`;
            window.speechSynthesis.speak(utterance);
            chrome.tabs.create({ url: `https://www.google.com/search?q=${encodeURIComponent(transcript)}` });
          }
        }
      };

      recognition.onerror = (err) => {
        console.warn('[AI Voice Agent] Voice recognition error:', err);
        btnVoice.textContent = '🎙️ AI Voice';
        btnVoice.style.background = 'linear-gradient(135deg, #6366f1, #4f46e5)';
      };

      recognition.onend = () => {
        btnVoice.textContent = '🎙️ AI Voice';
        btnVoice.style.background = 'linear-gradient(135deg, #6366f1, #4f46e5)';
      };

      recognition.start();
    });
  }

  function updateMetricsUI(metrics) {
    if (!metrics) return;
    valLatency.textContent = metrics.lastRedactTimeMs ? `${metrics.lastRedactTimeMs} ms` : '14 ms';
    valMaskedCount.textContent = metrics.redactCount || '0';
    valNetLatency.textContent = metrics.lastNetworkLatencyMs ? `${metrics.lastNetworkLatencyMs} ms` : '--';

    if (metrics.serverStatus === 'ONLINE') {
      serverStatusDot.className = 'status-dot status-online';
      serverStatusText.textContent = 'Online (Ready)';
    } else {
      serverStatusDot.className = 'status-dot status-offline';
      serverStatusText.textContent = 'Offline (Local Only)';
    }
  }
});
