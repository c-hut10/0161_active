function missionReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('a11y-reduce-motion');
}

/* Third-panel headline: flick through the requested sports words, then settle on club. */
(() => {
  const word = document.querySelector('.mission-panel__word[data-words]');
  const panel = word?.closest('.mission-panel');
  if (!word || !panel || missionReducedMotion()) return;

  const words = word.dataset.words.split('|').filter(Boolean);
  let wordIndex = 0;

  const flickNextWord = () => {
    if (missionReducedMotion()) {
      word.textContent = words[words.length - 1];
      word.classList.remove('is-flicking');
      return;
    }
    if (wordIndex >= words.length) return;

    word.classList.remove('is-flicking');
    word.textContent = words[wordIndex];
    word.classList.toggle('is-final', wordIndex === words.length - 1);
    void word.offsetWidth;
    word.classList.add('is-flicking');
    wordIndex += 1;

    if (wordIndex < words.length) window.setTimeout(flickNextWord, 495);
    else window.setTimeout(() => word.classList.remove('is-flicking'), 660);
  };

  // Play once as the final full-screen mission panel scrolls into view.
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some(entry => entry.isIntersecting)) {
        observer.disconnect();
        flickNextWord();
      }
    }, { threshold: 0.35 });
    observer.observe(panel);
  } else {
    flickNextWord();
  }
})();
