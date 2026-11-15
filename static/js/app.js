/**
 * ====================================================================
 * AURA LUXURY REAL ESTATE — MAIN APPLICATION CONTROLLER
 * File: static/js/app.js
 * ====================================================================
 */

'use strict';

const App = {
  // Global Application State
  state: {
    user: null,
    currentPage: null,
    theme: 'dark',
    sidebarOpen: true,
    currency: 'USD',
    currencySymbol: '$',
    exchangeRate: 1.0,
    activeCountry: 'all',
    isLoading: false
  },

  /**
   * Main Initialization
   */
  async init() {
    this.detectCurrentPage();
    this.initTheme();
    this.initScrollProgress();
    this.transitionPage();
    // Magnetic & ripple effects stripped for Apple minimalist high FPS
    this.animateCounters();
    this.initNavbarScroll();
    this.bindGlobalEvents();

    // Fetch authenticated user profile asynchronously
    await this.checkAuthStatus();
  },

  /**
   * Detect current route from window location or DOM attribute
   */
  detectCurrentPage() {
    const path = window.location.pathname;
    const bodyPage = document.body.getAttribute('data-page');

    if (bodyPage) {
      this.state.currentPage = bodyPage;
    } else if (path === '/' || path === '') {
      this.state.currentPage = 'home';
    } else {
      const segment = path.split('/').filter(Boolean)[0] || 'home';
      this.state.currentPage = segment;
    }

    document.documentElement.setAttribute('data-current-page', this.state.currentPage);
  },

  /**
   * Fetch Wrapper with Unified Error Handling & Loading Feedback
   */
  async api(url, options = {}) {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {})
      }
    };

    if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = { text: await response.text() };
      }

      if (!response.ok) {
        const errorMsg = data.message || data.error || `HTTP error ${response.status}: ${response.statusText}`;
        const error = new Error(errorMsg);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      console.error(`[App.api] Error during request to ${url}:`, err);
      // Suppress toast for user check when not logged in
      if (!url.includes('/api/user') || err.status !== 401) {
        this.showToast(err.message || 'An unexpected error occurred. Please try again.', 'error');
      }
      throw err;
    }
  },

  /**
   * Check Auth Status on initial load
   */
  async checkAuthStatus() {
    try {
      const res = await this.api('/api/user');
      if (res && res.user) {
        this.state.user = res.user;
        this.updateUserInterface(res.user);
      }
    } catch (e) {
      // User is guest/unauthenticated
      this.state.user = null;
    }
  },

  /**
   * Update UI elements based on logged in user
   */
  updateUserInterface(user) {
    const userElements = document.querySelectorAll('[data-user-name]');
    userElements.forEach(el => {
      el.textContent = user.full_name || user.email || 'Valued Client';
    });

    const roleElements = document.querySelectorAll('[data-user-role]');
    roleElements.forEach(el => {
      el.textContent = (user.role || 'Client').toUpperCase();
    });

    const avatarElements = document.querySelectorAll('[data-user-avatar]');
    avatarElements.forEach(el => {
      if (user.avatar_url) {
        el.src = user.avatar_url;
      } else {
        const initials = (user.full_name || user.email || 'U')
          .split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);
        el.setAttribute('data-initials', initials);
      }
    });

    document.querySelectorAll('.auth-guest-only').forEach(el => (el.style.display = 'none'));
    document.querySelectorAll('.auth-user-only').forEach(el => (el.style.display = ''));
  },

  /**
   * Toast Notification System (Luxury Glassmorphic Design)
   */
  showToast(message, type = 'info', duration = 4000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 99999;
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-width: 420px;
        width: calc(100vw - 48px);
        pointer-events: none;
      `;
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `luxury-toast toast-${type}`;
    toast.style.cssText = `
      pointer-events: auto;
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 16px 20px;
      border-radius: 14px;
      background: rgba(16, 20, 31, 0.92);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      color: #F8FAFC;
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      line-height: 1.5;
      box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.7), 0 0 20px rgba(212, 175, 55, 0.15);
      border: 1px solid rgba(212, 175, 55, 0.28);
      transform: translateX(120%);
      opacity: 0;
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
      overflow: hidden;
    `;

    // Type specific colors & icons
    let iconSvg = '';
    let accentColor = '#D4AF37'; // gold

    switch (type) {
      case 'success':
        accentColor = '#10B981';
        iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${accentColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
        break;
      case 'error':
        accentColor = '#EF4444';
        iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${accentColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
        break;
      case 'warning':
        accentColor = '#F59E0B';
        iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${accentColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
        break;
      default: // info
        accentColor = '#D4AF37';
        iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${accentColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.style.borderColor = `${accentColor}44`;

    toast.innerHTML = `
      <div style="flex-shrink: 0; margin-top: 1px;">${iconSvg}</div>
      <div style="flex-grow: 1; word-break: break-word;">${message}</div>
      <button type="button" class="toast-close" style="
        background: none;
        border: none;
        color: #94A3B8;
        cursor: pointer;
        padding: 0;
        margin-left: 8px;
        display: flex;
        align-items: center;
        transition: color 0.2s;
      " aria-label="Close notification">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
      <div class="toast-progress" style="
        position: absolute;
        bottom: 0;
        left: 0;
        height: 2px;
        background: ${accentColor};
        width: 100%;
        transition: width ${duration}ms linear;
      "></div>
    `;

    container.appendChild(toast);

    // Trigger entrance animation
    requestAnimationFrame(() => {
      toast.style.transform = 'translateX(0)';
      toast.style.opacity = '1';
      const progress = toast.querySelector('.toast-progress');
      if (progress) {
        requestAnimationFrame(() => {
          progress.style.width = '0%';
        });
      }
    });

    const closeBtn = toast.querySelector('.toast-close');
    let removeTimeout = null;

    const removeToast = () => {
      if (removeTimeout) clearTimeout(removeTimeout);
      toast.style.transform = 'translateX(120%)';
      toast.style.opacity = '0';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 400);
    };

    closeBtn.addEventListener('click', removeToast);
    removeTimeout = setTimeout(removeToast, duration);
  },

  /**
   * Page Entrance Transition
   */
  transitionPage() {
    const mainContent = document.querySelector('main') || document.querySelector('.main-content') || document.body;
    mainContent.style.opacity = '0';
    mainContent.style.transform = 'translateY(12px)';
    mainContent.style.transition = 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';

    requestAnimationFrame(() => {
      mainContent.style.opacity = '1';
      mainContent.style.transform = 'translateY(0)';
    });
  },

  /**
   * Top Scroll Progress Bar
   */
  initScrollProgress() {
    let progressBar = document.querySelector('.scroll-progress');
    if (!progressBar) {
      progressBar = document.createElement('div');
      progressBar.className = 'scroll-progress';
      progressBar.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        height: 3px;
        background: linear-gradient(90deg, #D4AF37 0%, #F5D76E 50%, #E5C158 100%);
        z-index: 100000;
        width: 0%;
        box-shadow: 0 0 10px rgba(212, 175, 55, 0.8);
        transition: width 0.1s ease-out;
        pointer-events: none;
      `;
      document.body.appendChild(progressBar);
    }

    const updateProgress = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      progressBar.style.width = `${Math.min(Math.max(scrollPercent, 0), 100)}%`;
    };

    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
  },

  /**
   * Fixed Navbar State on Scroll
   */
  initNavbarScroll() {
    const navbar = document.querySelector('.navbar') || document.querySelector('.main-nav');
    if (!navbar) return;

    const handleScroll = () => {
      if (window.scrollY > 40) {
        navbar.classList.add('scrolled', 'navbar-glass');
      } else {
        navbar.classList.remove('scrolled', 'navbar-glass');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
  },

  /**
   * Counter Number Animation with IntersectionObserver
   */
  animateCounters() {
    const counterElements = document.querySelectorAll('[data-counter], .stat-number, .counter');
    if (!counterElements.length) return;

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          obs.unobserve(el);

          const rawTarget = el.getAttribute('data-target') || el.textContent.replace(/[^0-9.]/g, '');
          const target = parseFloat(rawTarget);
          if (isNaN(target)) return;

          const prefix = el.getAttribute('data-prefix') || (el.textContent.trim().startsWith('$') ? '$' : '');
          const suffix = el.getAttribute('data-suffix') || '';
          const duration = parseInt(el.getAttribute('data-duration') || '1800', 10);
          const decimals = target % 1 !== 0 ? 1 : 0;

          let startTime = null;

          const step = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            // Ease out cubic
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const currentVal = easeProgress * target;

            el.textContent = `${prefix}${currentVal.toLocaleString('en-US', {
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals
            })}${suffix}`;

            if (progress < 1) {
              requestAnimationFrame(step);
            } else {
              el.textContent = `${prefix}${target.toLocaleString('en-US', {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
              })}${suffix}`;
            }
          };

          requestAnimationFrame(step);
        }
      });
    }, { threshold: 0.25 });

    counterElements.forEach(el => observer.observe(el));
  },

  /**
   * Magnetic Hover Effect for Luxury Elements & Buttons
   */
  initMagneticElements() {
    // Disabled for Apple minimalist performance & high FPS
  },

  /**
   * Typewriter Effect for Hero & Headings
   */
  typewriter(element, text, speed = 45) {
    return new Promise(resolve => {
      if (!element) return resolve();
      element.textContent = '';
      let index = 0;

      const cursor = document.createElement('span');
      cursor.className = 'typewriter-cursor';
      cursor.textContent = '|';
      cursor.style.cssText = 'color: #D4AF37; animation: blink 1s infinite; font-weight: 300;';
      element.appendChild(cursor);

      const type = () => {
        if (index < text.length) {
          cursor.before(document.createTextNode(text.charAt(index)));
          index++;
          setTimeout(type, speed);
        } else {
          setTimeout(() => {
            if (cursor.parentNode) cursor.remove();
            resolve();
          }, 800);
        }
      };

      type();
    });
  },

  /**
   * Text Scramble (Disabled for Apple crisp minimalism)
   */
  textScramble(element, newText) {
    if (element) element.textContent = newText;
  },

  /**
   * Price Formatter: '$1.25M', '$450K', or '$1,200'
   */
  formatPrice(num) {
    if (num === null || num === undefined || isNaN(num)) return '$0';
    const n = Number(num);
    const abs = Math.abs(n);

    if (abs >= 1e9) {
      return `$${(n / 1e9).toFixed(2).replace(/\.00$/, '')}B`;
    }
    if (abs >= 1e6) {
      return `$${(n / 1e6).toFixed(2).replace(/\.00$/, '')}M`;
    }
    if (abs >= 1e3) {
      return `$${(n / 1e3).toFixed(0)}K`;
    }
    return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  },

  /**
   * General Number Formatter: '147,000'
   */
  formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return '0';
    return Number(num).toLocaleString('en-US');
  },

  /**
   * Theme Initialization & Toggle
   */
  initTheme() {
    const savedTheme = localStorage.getItem('aura_theme') || 'dark';
    this.state.theme = savedTheme;
    document.documentElement.setAttribute('data-theme', savedTheme);
  },

  toggleTheme() {
    const nextTheme = this.state.theme === 'dark' ? 'light' : 'dark';
    this.state.theme = nextTheme;
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('aura_theme', nextTheme);
    this.showToast(`Theme changed to ${nextTheme} mode`, 'info', 2000);
  },

  /**
   * Particles (Stripped for high FPS Apple minimalism)
   */
  async initParticles(containerId) {
    // Disabled
  },

  /**
   * Smooth Scroll to Section with Header Offset
   */
  scrollToSection(sectionId) {
    const id = sectionId.replace('#', '');
    const target = document.getElementById(id);
    if (!target) return;

    const navbar = document.querySelector('.navbar');
    const offset = navbar ? navbar.offsetHeight + 16 : 80;
    const bodyRect = document.body.getBoundingClientRect().top;
    const elementRect = target.getBoundingClientRect().top;
    const elementPosition = elementRect - bodyRect;
    const offsetPosition = elementPosition - offset;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  },

  /**
   * Shimmer Skeleton Loading State
   */
  showLoading(container) {
    if (!container) return;
    container.classList.add('is-loading');

    // Create luxury skeleton placeholder if not present
    let loader = container.querySelector('.luxury-skeleton-overlay');
    if (!loader) {
      loader = document.createElement('div');
      loader.className = 'luxury-skeleton-overlay';
      loader.style.cssText = `
        position: absolute;
        inset: 0;
        background: rgba(10, 10, 15, 0.75);
        backdrop-filter: blur(8px);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
        z-index: 50;
        border-radius: inherit;
      `;
      loader.innerHTML = `
        <div class="luxury-spinner" style="
          width: 44px;
          height: 44px;
          border: 2px solid rgba(212, 175, 55, 0.2);
          border-top-color: #D4AF37;
          border-right-color: #F5D76E;
          border-radius: 50%;
          animation: spin 0.9s cubic-bezier(0.5, 0.1, 0.5, 0.9) infinite;
        "></div>
        <span style="font-family: 'Playfair Display', serif; font-size: 13px; color: #D4AF37; letter-spacing: 1.5px; text-transform: uppercase;">Aura Intelligence</span>
      `;
      container.style.position = container.style.position || 'relative';
      container.appendChild(loader);
    }
  },

  hideLoading(container) {
    if (!container) return;
    container.classList.remove('is-loading');
    const loader = container.querySelector('.luxury-skeleton-overlay');
    if (loader) {
      loader.style.transition = 'opacity 0.3s ease';
      loader.style.opacity = '0';
      setTimeout(() => loader.remove(), 300);
    }
  },

  /**
   * Click Ripple Effect on Interactive Elements
   */
  initRippleEffect() {
    // Disabled for instantaneous Apple interactions
  },

  /**
   * Bind Global DOM Events
   */
  bindGlobalEvents() {
    // Smooth scroll for anchor links with hash
    document.addEventListener('click', (e) => {
      const anchor = e.target.closest('a[href^="#"]');
      if (anchor) {
        const href = anchor.getAttribute('href');
        if (href && href.length > 1) {
          e.preventDefault();
          this.scrollToSection(href);
        }
      }
    });

    // Theme toggler click
    const themeToggleBtn = document.querySelector('.theme-toggle-btn');
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => this.toggleTheme());
    }
  }
};

// Global stylesheet injection for animations
const injectAppStyles = () => {
  if (document.getElementById('app-dynamic-styles')) return;
  const style = document.createElement('style');
  style.id = 'app-dynamic-styles';
  style.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }
    @keyframes rippleEffect {
      to {
        transform: scale(4);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
};

injectAppStyles();

// Expose to window
window.App = App;

// Automatic DOM Ready Listener
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => App.init());
} else {
  App.init();
}
