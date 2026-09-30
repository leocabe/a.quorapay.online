const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));
document.getElementById('year').textContent = new Date().getFullYear();

const floatingCta = document.querySelector('.floating-cta');
window.addEventListener('scroll', () => {
  floatingCta.classList.toggle('show', window.scrollY > 750);
}, { passive: true });

document.querySelectorAll('.accordion details').forEach((item) => {
  item.addEventListener('toggle', () => {
    if (!item.open) return;
    document.querySelectorAll('.accordion details[open]').forEach((openItem) => {
      if (openItem !== item) openItem.removeAttribute('open');
    });
  });
});
