/**
 * ====================================================================
 * ESTATEVISION — SIDEBAR CONTROLLER & HOVER-EXPAND SYSTEM
 * File: static/js/sidebar.js
 * ====================================================================
 */

'use strict';

const Sidebar = {
  isOpen: true,
  isMobile: false,
  breakpoint: 1024,
  elements: {},
  _lastToggle: 0,

  /**
   * Initialize Sidebar Subsystem
   */
  init() {
    this.cacheElements();
    this.checkViewport();
    this.restoreState();
    this.bindEvents();
    this.setActiveNavItem();
  },

  /**
   * Cache DOM Element References
   */
  cacheElements() {
    this.elements = {
      sidebar: document.getElementById('sidebar'),
      toggleBtns: document.querySelectorAll('#sidebarToggle, #sidebar-toggle, .sidebar-toggle, .sidebar-close-btn, #sidebarCloseBtn'),
      overlay: document.getElementById('sidebar-overlay'),
      mainContent: document.getElementById('mainContent') || document.querySelector('.main-content'),
      navLinks: document.querySelectorAll('.sidebar-nav .nav-item, .sidebar-nav a')
    };

    // Ensure overlay exists for mobile viewport
    if (!this.elements.overlay) {
      const overlay = document.createElement('div');
      overlay.id = 'sidebar-overlay';
      overlay.className = 'sidebar-backdrop';
      overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(10, 10, 15, 0.7);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        z-index: 990;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.25s ease;
      `;
      document.body.appendChild(overlay);
      this.elements.overlay = overlay;
    }
  },

  /**
   * Detect Viewport Size
   */
  checkViewport() {
    this.isMobile = window.innerWidth < this.breakpoint;
  },

  /**
   * Restore Sidebar Open/Closed State
   */
  restoreState() {
    this.checkViewport();

    if (this.isMobile) {
      this.close(false); // Mobile defaults to closed
    } else {
      const saved = localStorage.getItem('ev_sidebar_pinned');
      // Default open on desktop unless explicitly closed
      const shouldOpen = saved === null ? true : saved === 'true';
      if (shouldOpen) {
        this.open(false);
      } else {
        this.close(false);
      }
    }
  },

  /**
   * Toggle Sidebar Open / Closed with Debounce Protection
   */
  toggle() {
    const now = Date.now();
    if (now - this._lastToggle < 220) return;
    this._lastToggle = now;

    if (this.isOpen) {
      this.close(true);
    } else {
      this.open(true);
    }
  },

  /**
   * Open / Expand Sidebar
   */
  open(persist = true) {
    this.isOpen = true;
    const { sidebar, overlay } = this.elements;

    if (sidebar) {
      sidebar.classList.remove('collapsed', 'sidebar-closed', 'sidebar-collapsed');
      sidebar.classList.add('sidebar-open');
    }

    document.body.classList.remove('sidebar-collapsed', 'sidebar-is-collapsed');
    document.body.classList.add('sidebar-expanded');

    if (this.isMobile && overlay) {
      overlay.style.pointerEvents = 'auto';
      overlay.style.opacity = '1';
      document.body.style.overflow = 'hidden';
    }

    if (persist && !this.isMobile) {
      localStorage.setItem('ev_sidebar_pinned', 'true');
    }

    this.dispatchResize();
  },

  /**
   * Close / Collapse Sidebar
   */
  close(persist = true) {
    this.isOpen = false;
    const { sidebar, overlay } = this.elements;

    if (sidebar) {
      sidebar.classList.remove('sidebar-open', 'sidebar-hover-expanded');
      sidebar.classList.add('collapsed', 'sidebar-closed', 'sidebar-collapsed');
    }

    document.body.classList.remove('sidebar-expanded', 'sidebar-hover-active');
    document.body.classList.add('sidebar-collapsed', 'sidebar-is-collapsed');

    if (overlay) {
      overlay.style.pointerEvents = 'none';
      overlay.style.opacity = '0';
      document.body.style.overflow = '';
    }

    if (persist && !this.isMobile) {
      localStorage.setItem('ev_sidebar_pinned', 'false');
    }

    this.dispatchResize();
  },

  /**
   * Dispatch smooth layout reflow notification
   */
  dispatchResize() {
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 250);
  },

  /**
   * Highlight Active Navigation Route
   */
  setActiveNavItem() {
    const currentPath = window.location.pathname.toLowerCase();
    const navLinks = document.querySelectorAll('.sidebar-nav .nav-item');

    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;

      const linkPath = href.toLowerCase();
      const isMatch = (currentPath === '/' && linkPath === '/') ||
                      (linkPath !== '/' && currentPath.startsWith(linkPath));

      if (isMatch) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      } else {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
      }
    });
  },

  /**
   * Bind Event Listeners
   */
  bindEvents() {
    // 1. Toggle Button Click Handlers
    this.elements.toggleBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggle();
      });
    });

    // 2. HOVER TO TURN ON / OFF:
    // When sidebar is collapsed in dock mode, hovering over it expands it to 240px with full text.
    // Moving the mouse away turns it off and collapses back to 68px.
    const sidebar = this.elements.sidebar;
    if (sidebar) {
      sidebar.addEventListener('mouseenter', () => {
        if (!this.isOpen && !this.isMobile) {
          sidebar.classList.add('sidebar-hover-expanded');
          document.body.classList.add('sidebar-hover-active');
        }
      });

      sidebar.addEventListener('mouseleave', () => {
        if (!this.isOpen && !this.isMobile) {
          sidebar.classList.remove('sidebar-hover-expanded');
          document.body.classList.remove('sidebar-hover-active');
        }
      });
    }

    // 3. Mobile Backdrop Click
    if (this.elements.overlay) {
      this.elements.overlay.addEventListener('click', () => {
        if (this.isMobile) this.close();
      });
    }

    // 4. Keyboard ESC to Close Mobile Sidebar
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isMobile && this.isOpen) {
        this.close();
      }
    });

    // 5. Viewport Resize Listener with Debounce
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const wasMobile = this.isMobile;
        this.checkViewport();

        if (wasMobile !== this.isMobile) {
          if (this.isMobile) {
            this.close(false);
          } else {
            const saved = localStorage.getItem('ev_sidebar_pinned');
            if (saved !== 'false') this.open(false);
          }
        }
      }, 150);
    });
  }
};

// Global Exposure & Auto-initialization
window.Sidebar = Sidebar;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Sidebar.init());
} else {
  Sidebar.init();
}
