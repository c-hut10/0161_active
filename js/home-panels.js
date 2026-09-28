/* Mission heading counter: quickly count the database figure up once it enters view. */
(() => {
  const counter = document.querySelector('[data-count-up]');
  if (!counter) return;

  const target = Number(counter.dataset.countUp);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion || !Number.isFinite(target)) return;

  const countUp = () => {
    const duration = 1400;
    const startedAt = performance.now();

    const update = (now) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(target * easedProgress);
      counter.textContent = `${current}+`;

      if (progress < 1) requestAnimationFrame(update);
    };

    counter.textContent = '0+';
    requestAnimationFrame(update);
  };

  // Start the count only when the mission heading is near the viewport.
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some(entry => entry.isIntersecting)) {
        observer.disconnect();
        countUp();
      }
    }, { threshold: 0.5 });
    observer.observe(counter);
  } else {
    countUp();
  }
})();

/* Third-panel headline: flick through the requested sports words, then settle on club. */
(() => {
  const word = document.querySelector('.mission-panel__word[data-words]');
  const panel = word?.closest('.mission-panel');
  if (!word || !panel || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const words = word.dataset.words.split('|').filter(Boolean);
  let wordIndex = 0;

  const flickNextWord = () => {
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
