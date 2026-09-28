/**
 * ISRO AI Voice Command Widget for Browser Agent Portal
 */
(function() {
  // Inject Widget CSS
  const style = document.createElement('style');
  style.textContent = `
    .voice-widget-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: linear-gradient(135deg, #6366f1, #4f46e5);
      color: #ffffff;
      border: none;
      border-radius: 50px;
      padding: 14px 22px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
      display: flex;
      align-items: center;
      gap: 10px;
      z-index: 9999;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .voice-widget-btn:hover {
      transform: translateY(-2px) scale(1.03);
      box-shadow: 0 12px 28px rgba(99, 102, 241, 0.5);
    }
    .voice-pulse {
      width: 10px;
      height: 10px;
      background-color: #34d399;
      border-radius: 50%;
      box-shadow: 0 0 8px #34d399;
    }
    .voice-widget-btn.listening {
      background: #dc2626 !important;
      box-shadow: 0 8px 24px rgba(220, 38, 38, 0.5) !important;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.6); }
      70% { box-shadow: 0 0 0 14px rgba(220, 38, 38, 0); }
      100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
    }
  `;
  document.head.appendChild(style);

  // Inject Button HTML
  const btn = document.createElement('button');
  btn.className = 'voice-widget-btn';
  btn.id = 'aiVoiceWidgetBtn';
  btn.innerHTML = `<span class="voice-pulse"></span> 🎙️ Speak Command`;
  document.body.appendChild(btn);

  function speakAndNavigate(text, url, isNewTab = true) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const speakText = text.replace(/isro/gi, 'I S R O');
      const utterance = new SpeechSynthesisUtterance(speakText);
      utterance.rate = 1.0;

      if (isNewTab) {
        window.open(url, '_blank');
        window.speechSynthesis.speak(utterance);
      } else {
        let navigated = false;
        const nav = () => {
          if (!navigated) {
            navigated = true;
            window.location.href = url;
          }
        };
        utterance.onend = nav;
        utterance.onerror = nav;
        setTimeout(nav, 1500);
        window.speechSynthesis.speak(utterance);
      }
    } else {
      if (isNewTab) {
        window.open(url, '_blank');
      } else {
        window.location.href = url;
      }
    }
  }

  btn.addEventListener('click', function() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition API is not supported in this browser version. Please use Chrome.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    btn.classList.add('listening');
    btn.innerHTML = `🎙️ Listening...`;

    recognition.onresult = function(event) {
      const transcript = event.results[0][0].transcript.toLowerCase().trim();
      console.log('[ISRO Voice Agent] Recognized:', transcript);
      btn.classList.remove('listening');
      btn.innerHTML = `<span class="voice-pulse"></span> 🎙️ Speak Command`;

      const isSearchIntent = transcript.includes('search') || transcript.includes('find') || transcript.includes('look up') || transcript.includes('who is') || transcript.includes('what is') || transcript.includes('play') || transcript.includes('show');

      if (isSearchIntent) {
        let query = transcript.replace(/^(search for|search|find|look up|who is|what is|play|show)/i, '').trim();
        if (!query) query = transcript;

        if (transcript.includes('youtube')) {
          query = query.replace(/on youtube|youtube/gi, '').trim();
          if (!query) query = 'trending';
          speakAndNavigate(`Searching YouTube for ${query}.`, `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, true);
        } else {
          speakAndNavigate(`Searching Google for ${query}.`, `https://www.google.com/search?q=${encodeURIComponent(query)}`, true);
        }
      } else if (transcript.includes('form') || transcript.includes('portal')) {
        speakAndNavigate('Navigating to Confidential Form Portal.', 'form.html', false);
      } else if (transcript.includes('home')) {
        speakAndNavigate('Navigating to Home page.', 'index.html', false);
      } else if (transcript.includes('metric') || transcript.includes('spec')) {
        speakAndNavigate('Opening SIH PS 26171 evaluation specs.', 'metrics.html', false);
      } else if (transcript.includes('submit') || transcript.includes('execute') || transcript.includes('click')) {
        if ('speechSynthesis' in window) {
          const utt = new SpeechSynthesisUtterance('Submitting confidential form.');
          window.speechSynthesis.speak(utt);
        }
        const formBtn = document.getElementById('btnSubmitForm');
        if (formBtn) formBtn.click();
      } else if (transcript === 'youtube' || transcript === 'open youtube') {
        speakAndNavigate('Opening YouTube for you.', 'https://www.youtube.com', true);
      } else if (transcript === 'google' || transcript === 'open google') {
        speakAndNavigate('Opening Google search.', 'https://www.google.com', true);
      } else {
        // Fallback: Perform Google Search for any recognized query
        speakAndNavigate(`Searching Google for ${transcript}.`, `https://www.google.com/search?q=${encodeURIComponent(transcript)}`, true);
      }
    };

    recognition.onerror = function(err) {
      console.warn('[ISRO Voice Agent] Error:', err);
      btn.classList.remove('listening');
      btn.innerHTML = `<span class="voice-pulse"></span> 🎙️ Speak Command`;
    };

    recognition.onend = function() {
      btn.classList.remove('listening');
      btn.innerHTML = `<span class="voice-pulse"></span> 🎙️ Speak Command`;
    };

    recognition.start();
  });
})();
