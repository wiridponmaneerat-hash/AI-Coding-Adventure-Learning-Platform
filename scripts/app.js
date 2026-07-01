/* ============================================================
   AI Coding Adventure — app.js
   ============================================================ */

gsap.registerPlugin(ScrollTrigger);

/* ----- Navbar scroll effect ----- */
(function initNavbar() {
  const navbar = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const navMenu = document.getElementById('navMenu');
  const navLinks = document.querySelectorAll('.nav-link');

  window.addEventListener('scroll', function () {
    if (window.scrollY > 20) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }, { passive: true });

  hamburger.addEventListener('click', function () {
    const isOpen = navMenu.classList.toggle('open');
    hamburger.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', String(isOpen));
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  navLinks.forEach(function (link) {
    link.addEventListener('click', function () {
      navMenu.classList.remove('open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });

  /* Active link on scroll */
  const sections = document.querySelectorAll('section[id], footer[id]');
  const observerOpts = { rootMargin: '-40% 0px -55% 0px' };

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        navLinks.forEach(function (l) { l.classList.remove('active'); });
        const active = document.querySelector('.nav-link[href="#' + entry.target.id + '"]');
        if (active) active.classList.add('active');
      }
    });
  }, observerOpts);

  sections.forEach(function (s) { observer.observe(s); });
})();


/* ----- Smooth scroll for anchor links ----- */
document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
  anchor.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 72;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: top, behavior: 'smooth' });
  });
});


/* ----- Hero entrance animations ----- */
(function initHero() {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  tl.from('#heroBadge', { y: 24, opacity: 0, duration: 0.6 })
    .from('#heroHeadline', { y: 40, opacity: 0, duration: 0.75 }, '-=0.3')
    .from('#heroSub', { y: 32, opacity: 0, duration: 0.65 }, '-=0.4')
    .from('#heroCtas', { y: 28, opacity: 0, duration: 0.55 }, '-=0.35')
    .from('#heroVisual', { x: 60, opacity: 0, duration: 0.9, ease: 'power2.out' }, '-=0.6')
    .from('.float-badge', { scale: 0.6, opacity: 0, stagger: 0.2, duration: 0.4, ease: 'back.out(1.7)' }, '-=0.4');

  /* Robot body float */
  gsap.to('.robot-body', {
    y: -14,
    duration: 2.8,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1
  });

  /* Hero orbs parallax */
  document.addEventListener('mousemove', function (e) {
    const cx = e.clientX / window.innerWidth - 0.5;
    const cy = e.clientY / window.innerHeight - 0.5;
    gsap.to('.hero-orb--1', { x: cx * 30, y: cy * 20, duration: 1.2, ease: 'power1.out' });
    gsap.to('.hero-orb--2', { x: cx * -20, y: cy * -15, duration: 1.2, ease: 'power1.out' });
    gsap.to('.hero-orb--3', { x: cx * 15, y: cy * 10, duration: 1, ease: 'power1.out' });
  });

  /* Robot eye tracking */
  document.addEventListener('mousemove', function (e) {
    const pupils = document.querySelectorAll('.robot-pupil');
    const robot = document.querySelector('.robot-head');
    if (!robot) return;
    const rect = robot.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / window.innerWidth;
    const dy = (e.clientY - cy) / window.innerHeight;
    pupils.forEach(function (pupil) {
      gsap.to(pupil, { x: dx * 4, y: dy * 4, duration: 0.3 });
    });
  });
})();


/* ----- Features scroll reveal ----- */
gsap.from('.feature-card', {
  scrollTrigger: {
    trigger: '.features',
    start: 'top 80%',
    toggleActions: 'play none none none',
    once: true
  },
  y: 40,
  opacity: 0,
  duration: 0.6,
  stagger: 0.12,
  ease: 'power2.out',
  immediateRender: false
});

gsap.from('.features .section-header', {
  scrollTrigger: {
    trigger: '.features',
    start: 'top 85%',
    toggleActions: 'play none none none',
    once: true
  },
  y: 30,
  opacity: 0,
  duration: 0.6,
  ease: 'power2.out',
  immediateRender: false
});


/* ----- Mission cards reveal ----- */
gsap.from('.missions .section-header', {
  scrollTrigger: {
    trigger: '.missions',
    start: 'top 80%',
    toggleActions: 'play none none none',
    once: true
  },
  y: 30,
  opacity: 0,
  duration: 0.6,
  ease: 'power2.out',
  immediateRender: false
});

gsap.from('.mission-card', {
  scrollTrigger: {
    trigger: '.mission-grid',
    start: 'top 80%',
    toggleActions: 'play none none none',
    once: true
  },
  y: 50,
  opacity: 0,
  duration: 0.65,
  stagger: 0.1,
  ease: 'power2.out',
  immediateRender: false
});




/* ----- Dashboard reveal ----- */
(function initDashboard() {
  gsap.from('.dashboard-preview .section-header', {
    scrollTrigger: {
      trigger: '.dashboard-preview',
      start: 'top 80%',
      once: true
    },
    y: 30,
    opacity: 0,
    duration: 0.6,
    ease: 'power2.out',
    immediateRender: false
  });

  gsap.from('.dash-mini-card', {
    scrollTrigger: {
      trigger: '.dashboard-analytics-row',
      start: 'top 82%',
      once: true
    },
    y: 30,
    opacity: 0,
    duration: 0.55,
    stagger: 0.1,
    ease: 'power2.out',
    immediateRender: false
  });

  gsap.from('.dash-chart-card, .dash-ai-card', {
    scrollTrigger: {
      trigger: '.dashboard-main-grid',
      start: 'top 82%',
      once: true
    },
    y: 40,
    opacity: 0,
    duration: 0.65,
    stagger: 0.15,
    ease: 'power2.out',
    immediateRender: false
  });

  gsap.from('.dash-table-card', {
    scrollTrigger: {
      trigger: '.dash-table-card',
      start: 'top 85%',
      once: true
    },
    y: 30,
    opacity: 0,
    duration: 0.6,
    ease: 'power2.out',
    immediateRender: false
  });

  /* Animate chart bars */
  ScrollTrigger.create({
    trigger: '.chart-area',
    start: 'top 80%',
    once: true,
    onEnter: function () {
      document.querySelectorAll('.chart-bar').forEach(function (bar, i) {
        gsap.to(bar, {
          scaleY: 1,
          opacity: 1,
          duration: 0.8,
          delay: i * 0.12,
          ease: 'back.out(1.2)',
          transformOrigin: 'bottom'
        });
        bar.classList.add('animated');
      });
    }
  });

  /* Table rows stagger */
  gsap.from('.student-table tbody tr', {
    scrollTrigger: {
      trigger: '.student-table',
      start: 'top 85%',
      once: true
    },
    x: -20,
    opacity: 0,
    duration: 0.45,
    stagger: 0.08,
    ease: 'power2.out',
    immediateRender: false
  });
})();


/* ----- Footer reveal ----- */
gsap.from('.footer-brand', {
  scrollTrigger: {
    trigger: '.footer',
    start: 'top 90%',
    once: true
  },
  y: 24,
  opacity: 0,
  duration: 0.55,
  ease: 'power2.out',
  immediateRender: false
});


/* ----- Hover micro-animations ----- */
(function initHover() {
  /* Mission buttons */
  document.querySelectorAll('.mission-btn').forEach(function (btn) {
    btn.addEventListener('mouseenter', function () {
      gsap.to(btn.querySelector('.material-symbols-rounded'), {
        x: 4,
        duration: 0.2,
        ease: 'power1.out'
      });
    });
    btn.addEventListener('mouseleave', function () {
      gsap.to(btn.querySelector('.material-symbols-rounded'), {
        x: 0,
        duration: 0.2,
        ease: 'power1.in'
      });
    });
  });

  /* CTA primary button pulse on idle */
  const ctaPrimary = document.querySelector('.cta-primary');
  if (ctaPrimary) {
    gsap.to(ctaPrimary, {
      boxShadow: '0 16px 48px rgba(37,99,235,0.45)',
      duration: 1.4,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1
    });
  }
})();


/* ----- Keyboard accessibility for mission cards ----- */
document.querySelectorAll('.mission-card[tabindex="0"]').forEach(function (card) {
  card.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const link = card.querySelector('.mission-btn');
      if (link) link.click();
    }
  });
});

document.querySelectorAll('.feature-card[tabindex="0"]').forEach(function (card) {
  card.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      gsap.from(card, { scale: 0.98, duration: 0.1 });
    }
  });
});
