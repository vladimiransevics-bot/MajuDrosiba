const burger = document.getElementById('burger');
const mobileNav = document.getElementById('mobile-nav');
const header = document.getElementById('header');

burger.addEventListener('click', () => {
  const open = mobileNav.classList.toggle('open');
  burger.classList.toggle('open', open);
  burger.setAttribute('aria-expanded', open);
  mobileNav.setAttribute('aria-hidden', !open);
});

mobileNav.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    mobileNav.classList.remove('open');
    burger.classList.remove('open');
    burger.setAttribute('aria-expanded', false);
    mobileNav.setAttribute('aria-hidden', true);
  });
});

window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 10);
}, { passive: true });

// Hero count-up: animate [data-count] numbers from 0 to target when they enter viewport.
// Respects prefers-reduced-motion (shows final value immediately).
(function initCountUp() {
  const els = document.querySelectorAll('[data-count]');
  if (!els.length) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) {
    els.forEach(el => { el.textContent = el.dataset.count; });
    return;
  }

  const animate = (el) => {
    const target = parseInt(el.dataset.count, 10);
    if (isNaN(target)) return;
    const duration = 1500;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      el.textContent = Math.round(target * eased);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animate(entry.target);
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });

  els.forEach(el => io.observe(el));
})();

// Scroll-reveal for service cards: staggered fade+slide when they enter viewport.
// Progressive enhancement — CSS reveals only apply when the .js-scroll-reveal class
// is present on the grid (added here), so JS-off users still see all cards.
(function initScrollReveal() {
  const grid = document.querySelector('.services-grid');
  if (!grid) return;
  grid.classList.add('js-scroll-reveal');

  const cards = grid.querySelectorAll('.service-card');
  if (!cards.length) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) {
    cards.forEach(c => c.classList.add('is-visible'));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  cards.forEach(c => io.observe(c));
})();

// Sticky mobile CTA: visible only when user has scrolled past hero AND footer is not visible.
// Uses two IntersectionObservers to avoid scroll listeners.
(function initMobileCTA() {
  const cta = document.getElementById('mobile-cta');
  const hero = document.getElementById('hero');
  const footer = document.querySelector('.footer');
  if (!cta || !hero) return;

  // Skip on admin/other pages (safety net if included accidentally)
  if (location.pathname.startsWith('/admin')) return;

  cta.hidden = false;
  let heroInView = true;
  let footerInView = false;

  const update = () => {
    const shouldShow = !heroInView && !footerInView;
    cta.classList.toggle('is-visible', shouldShow);
  };

  new IntersectionObserver((entries) => {
    heroInView = entries[0].isIntersecting;
    update();
  }, { threshold: 0.1 }).observe(hero);

  if (footer) {
    new IntersectionObserver((entries) => {
      footerInView = entries[0].isIntersecting;
      update();
    }, { threshold: 0 }).observe(footer);
  }
})();
