/**
 * ====================================================================
 * ESTATEVISION — NAVIGATION CONTROLLER
 * File: static/js/nav.js
 * Handles: topbar hide/show, theme toggle, user dropdown
 * ====================================================================
 */

'use strict';

const Nav = {
  lastScrollY: 0,
  scrollDelta: 0,
  threshold: 8,
  ticking: false,
  topbar: null,
  userMenu: null,
  themeToggle: null,

  init() {
    this.topbar = document.getElementById('evTopbar');
    this.userMenu = document.getElementById('evUserMenu');
    this.themeToggle = document.getElementById('evThemeToggle');

    if (!this.topbar) return;

    this.initTheme();
    this.bindScroll();
    this.bindUserMenu();
    this.bindThemeToggle();
  },

  /* ─── Scroll: hide on down, show on up ─── */
  bindScroll() {
    window.addEventListener('scroll', () => {
      if (this.ticking) return;
      this.ticking = true;
      requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const delta = currentY - this.lastScrollY;

        // Add/remove scrolled glass
        if (currentY > 48) {
          this.topbar.classList.add('ev-topbar--scrolled');
        } else {
          this.topbar.classList.remove('ev-topbar--scrolled');
        }

        // Hide/show based on direction
        if (delta > this.threshold && currentY > 100) {
          this.topbar.classList.add('ev-topbar--hidden');
        } else if (delta < -this.threshold || currentY < 10) {
          this.topbar.classList.remove('ev-topbar--hidden');
        }

        this.lastScrollY = currentY;
        this.ticking = false;
      });
    }, { passive: true });
  },

  /* ─── User Dropdown ─── */
  bindUserMenu() {
    if (!this.userMenu) return;

    const btn = this.userMenu.querySelector('.ev-avatar-btn');
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.userMenu.classList.toggle('active');
      });
    }

    document.addEventListener('click', (e) => {
      if (this.userMenu && !this.userMenu.contains(e.target)) {
        this.userMenu.classList.remove('active');
      }
    });
  },

  /* ─── Theme Toggle ─── */
  bindThemeToggle() {
    if (!this.themeToggle) return;

    this.themeToggle.addEventListener('click', () => {
      const html = document.documentElement;
      const current = html.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';

      html.setAttribute('data-theme', next);
      localStorage.setItem('ev_theme', next);

      // Re-render Lucide icons
      if (window.lucide) {
        setTimeout(() => lucide.createIcons(), 50);
      }

      // Notify via toast
      if (window.Toast) {
        Toast.show(`Switched to ${next} mode`, 'info', 2000);
      }
    });
  },

  initTheme() {
    const saved = localStorage.getItem('ev_theme');
    const theme = saved || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
  }
};

window.Nav = Nav;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Nav.init());
} else {
  Nav.init();
}
