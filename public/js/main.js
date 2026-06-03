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
