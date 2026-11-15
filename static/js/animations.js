/**
 * ====================================================================
 * AURA LUXURY REAL ESTATE — GSAP & SCROLL ANIMATIONS ENGINE
 * File: static/js/animations.js
 * ====================================================================
 */

'use strict';

const Animations = {
  /**
   * Main Engine Initialization
   */
  init() {
    if (typeof gsap === 'undefined') {
      console.warn('[Animations] GSAP is not loaded. Skipping custom animations.');
      return;
    }

    if (typeof ScrollTrigger !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);
    }

    this.initAOS();
    this.heroAnimations();
    this.sectionReveals();
    this.parallaxEffects();
    this.staggeredCards();
    this.counterAnimations();
    this.textAnimations();
    this.scrollIndicator();
    this.magneticButtons();
    this.smoothReveal();
  },

  /**
   * Initialize AOS (Animate on Scroll) as a lightweight reveal baseline
   */
  initAOS() {
    if (typeof AOS !== 'undefined') {
      AOS.init({
        offset: 80,
        duration: 850,
        easing: 'ease-out-cubic',
        once: true,
        disable: 'mobile'
      });
    }
  },

  /**
   * High-End Hero Section Timeline Entrance
   */
  heroAnimations() {
    const hero = document.querySelector('.hero-section') || document.querySelector('.hero');
    if (!hero) return;

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    const eyebrow = hero.querySelector('.hero-eyebrow, .hero-tag, .hero-badge');
    const title = hero.querySelector('.hero-title, .hero-heading, h1');
    const subtitle = hero.querySelector('.hero-subtitle, .hero-desc, p.lead');
    const ctas = hero.querySelectorAll('.hero-cta, .hero-buttons, .hero-actions .btn');
    const stats = hero.querySelectorAll('.hero-stats, .hero-metrics, .stat-badge');
    const globeWrapper = document.querySelector('.globe-wrapper, #globeViz, .hero-visual');

    // 1. Eyebrow badge
    if (eyebrow) {
      tl.fromTo(eyebrow, 
        { y: 24, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.8, delay: 0.1 }
      );
    }

    // 2. Main Title - luxury slide & reveal
    if (title) {
      tl.fromTo(title,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.1, clearProps: 'transform' },
        '-=0.5'
      );
    }

    // 3. Subtitle
    if (subtitle) {
      tl.fromTo(subtitle,
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.9 },
        '-=0.7'
      );
    }

    // 4. CTA buttons stagger
    if (ctas.length > 0) {
      tl.fromTo(ctas,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.15 },
        '-=0.6'
      );
    }

    // 5. Hero Stats
    if (stats.length > 0) {
      tl.fromTo(stats,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.9, stagger: 0.1 },
        '-=0.5'
      );
    }

    // 6. Globe 3D Visualizer entrance
    if (globeWrapper) {
      gsap.fromTo(globeWrapper,
        { scale: 0.9, opacity: 0 },
        { scale: 1, opacity: 1, duration: 1.6, ease: 'power2.out', delay: 0.2 }
      );
    }

    // ScrollTrigger Parallax on Hero Content
    if (typeof ScrollTrigger !== 'undefined' && title) {
      gsap.to([title, subtitle, eyebrow], {
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: 'bottom top',
          scrub: 1
        },
        y: 60,
        opacity: 0.4
      });
    }
  },

  /**
   * ScrollTrigger Staggered Section Reveals
   */
  sectionReveals() {
    if (typeof ScrollTrigger === 'undefined') return;

    const sections = document.querySelectorAll('.reveal-section, section.luxury-section, .page-section');
    sections.forEach(section => {
      const header = section.querySelector('.section-header, .section-title-wrap');
      const content = section.querySelectorAll('.section-content, .section-grid, .section-body');

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top 80%',
          toggleActions: 'play none none none'
        }
      });

      if (header) {
        tl.fromTo(header,
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out' }
        );
      }

      if (content.length > 0) {
        tl.fromTo(content,
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, stagger: 0.15, ease: 'power3.out' },
          '-=0.5'
        );
      }
    });
  },

  /**
   * Parallax Floating Mesh & Ambient Glowing Orbs
   */
  parallaxEffects() {
    if (typeof ScrollTrigger === 'undefined') return;

    const floatingOrbs = document.querySelectorAll('.glow-orb, .ambient-glow, .parallax-bg, [data-parallax]');
    floatingOrbs.forEach(orb => {
      const speed = parseFloat(orb.getAttribute('data-speed') || '0.25');
      gsap.to(orb, {
        scrollTrigger: {
          trigger: orb.parentElement || document.body,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true
        },
        y: (i, target) => -window.innerHeight * speed,
        ease: 'none'
      });
    });
  },

  /**
   * Staggered Luxury Card Appearances
   */
  staggeredCards() {
    if (typeof ScrollTrigger === 'undefined') return;

    const cardContainers = document.querySelectorAll(
      '.luxury-grid, .properties-grid, .features-grid, .stats-grid, .insights-grid'
    );

    cardContainers.forEach(container => {
      const cards = container.querySelectorAll(
        '.luxury-card, .feature-card, .property-card, .metric-card, .city-card'
      );
      if (!cards.length) return;

      gsap.fromTo(cards,
        { y: 50, opacity: 0, scale: 0.96 },
        {
          scrollTrigger: {
            trigger: container,
            start: 'top 82%',
            toggleActions: 'play none none none'
          },
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.85,
          stagger: 0.12,
          ease: 'power3.out'
        }
      );
    });
  },

  /**
   * Precision Counter Animations with GSAP Tween
   */
  counterAnimations() {
    if (typeof ScrollTrigger === 'undefined') return;

    const counters = document.querySelectorAll('[data-gsap-counter]');
    counters.forEach(counter => {
      const rawTarget = counter.getAttribute('data-target') || counter.textContent.replace(/[^0-9.]/g, '');
      const targetVal = parseFloat(rawTarget);
      if (isNaN(targetVal)) return;

      const prefix = counter.getAttribute('data-prefix') || '';
      const suffix = counter.getAttribute('data-suffix') || '';
      const decimals = targetVal % 1 !== 0 ? 1 : 0;

      const stateObj = { val: 0 };

      gsap.to(stateObj, {
        scrollTrigger: {
          trigger: counter,
          start: 'top 85%',
          toggleActions: 'play none none none'
        },
        val: targetVal,
        duration: 2.0,
        ease: 'power2.out',
        onUpdate: () => {
          counter.textContent = `${prefix}${stateObj.val.toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
          })}${suffix}`;
        }
      });
    });
  },

  /**
   * Text Slide & Character Reveal Animations
   */
  textAnimations() {
    if (typeof ScrollTrigger === 'undefined') return;

    // Slide text from left
    const slideLefts = document.querySelectorAll('.slide-text-left');
    slideLefts.forEach(el => {
      gsap.fromTo(el,
        { x: -50, opacity: 0 },
        {
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            toggleActions: 'play none none none'
          },
          x: 0,
          opacity: 1,
          duration: 0.9,
          ease: 'power3.out'
        }
      );
    });

    // Reveal text clip effect
    const revealTexts = document.querySelectorAll('.reveal-text');
    revealTexts.forEach(el => {
      gsap.fromTo(el,
        { y: 30, opacity: 0 },
        {
          scrollTrigger: {
            trigger: el,
            start: 'top 88%',
            toggleActions: 'play none none none'
          },
          y: 0,
          opacity: 1,
          duration: 1.0,
          ease: 'power4.out'
        }
      );
    });
  },

  /**
   * Scroll Indicator with Looping Bounce & Scroll Fadeout
   */
  scrollIndicator() {
    const indicator = document.querySelector('.scroll-indicator, .scroll-down, .mouse-indicator');
    if (!indicator) return;

    // Smooth floating bounce
    gsap.to(indicator, {
      y: 10,
      duration: 1.4,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });

    // Fade out upon scrolling down
    if (typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.create({
        start: 'top -40px',
        onEnter: () => gsap.to(indicator, { opacity: 0, pointerEvents: 'none', duration: 0.3 }),
        onLeaveBack: () => gsap.to(indicator, { opacity: 1, pointerEvents: 'auto', duration: 0.3 })
      });
    }
  },

  /**
   * High-Performance Magnetic Attraction on Buttons
   */
  magneticButtons() {
    const buttons = document.querySelectorAll('.magnetic-btn, .btn-magnetic, .btn-luxury-gold');
    if (!buttons.length) return;

    buttons.forEach(btn => {
      const xTo = gsap.quickTo(btn, 'x', { duration: 0.3, ease: 'power3' });
      const yTo = gsap.quickTo(btn, 'y', { duration: 0.3, ease: 'power3' });

      btn.addEventListener('mousemove', (e) => {
        const { clientX, clientY } = e;
        const { height, width, left, top } = btn.getBoundingClientRect();
        const x = clientX - (left + width / 2);
        const y = clientY - (top + height / 2);
        xTo(x * 0.3);
        yTo(y * 0.3);
      });

      btn.addEventListener('mouseleave', () => {
        gsap.to(btn, {
          x: 0,
          y: 0,
          duration: 0.7,
          ease: 'elastic.out(1.1, 0.3)'
        });
      });
    });
  },

  /**
   * General Smooth Reveal for Class-Based Targets
   */
  smoothReveal() {
    if (typeof ScrollTrigger === 'undefined') return;

    const fadeElements = document.querySelectorAll('.animate-fade-up, .fade-in-up');
    fadeElements.forEach(el => {
      gsap.fromTo(el,
        { y: 35, opacity: 0 },
        {
          scrollTrigger: {
            trigger: el,
            start: 'top 88%',
            toggleActions: 'play none none none'
          },
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'power2.out'
        }
      );
    });

    const scaleElements = document.querySelectorAll('.animate-scale-in, .scale-in');
    scaleElements.forEach(el => {
      gsap.fromTo(el,
        { scale: 0.92, opacity: 0 },
        {
          scrollTrigger: {
            trigger: el,
            start: 'top 88%',
            toggleActions: 'play none none none'
          },
          scale: 1,
          opacity: 1,
          duration: 0.8,
          ease: 'power3.out'
        }
      );
    });
  }
};

// Expose globally
window.Animations = Animations;

// Auto-run if DOM already loaded or on event
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Animations.init());
} else {
  Animations.init();
}
