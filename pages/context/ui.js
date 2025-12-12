// Lightweight UI helpers: parallax hero and button micro-interactions
(function(){
  // Parallax for hero background. Keep it cheap: translateY on the background element.
  const heroBg = document.querySelector('[data-parallax="hero"]');
  if (heroBg) {
    const factor = 0.25; // slower movement
    let lastScroll = 0;
    let ticking = false;
    function onScroll() {
      lastScroll = window.scrollY;
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const offset = lastScroll * factor;
          heroBg.style.transform = `translateY(${offset}px)`;
          ticking = false;
        });
        ticking = true;
      }
    }
    // only enable on medium+ screens to avoid mobile performance costs
    if (window.innerWidth >= 768) {
      window.addEventListener('scroll', onScroll, { passive: true });
      // initialize
      onScroll();
    }
  }

  // Button micro-interactions: add a quick pop on click
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-primary');
    if (!btn) return;
    btn.classList.add('pop');
    setTimeout(() => btn.classList.remove('pop'), 360);
  });

  // Header transparency when scrolled: toggle a class on the header for a clean effect
  (function headerScrollHandler(){
    const header = document.querySelector('header');
    if (!header) return;
    const threshold = 24; // pixels scrolled before applying transparency
    let lastScroll = window.scrollY;
    let ticking = false;

    function update() {
      const y = window.scrollY;
      if (y > threshold) header.classList.add('header--transparent');
      else header.classList.remove('header--transparent');
      ticking = false;
    }

    function onScroll() {
      lastScroll = window.scrollY;
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }

    // Initialize state
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
  })();

  // Reduce motion respect: if user prefers reduced motion, disable parallax
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (mq && mq.matches) {
    if (heroBg) heroBg.style.transform = ''; // remove transforms
  }
})();
