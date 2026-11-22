/**
 * ====================================================================
 * ESTATEVISION — SIDEBAR CONTROLLER (Apple-Style Rail)
 * File: static/js/sidebar.js
 * Default: collapsed 72px rail, icons only
 * Hover: expands to 240px with labels (desktop)
 * Pin: toggle button locks it open
 * Mobile: slide-over drawer with backdrop
 * ====================================================================
 */

'use strict';

const Sidebar = {
  isPinned: false,
  isMobile: false,
  breakpoint: 1024,
  _lastToggle: 0,

  el: {
    sidebar: null,
    toggleBtns: null,
    backdrop: null,
    main: null
  },

  init() {
    this.el.sidebar    = document.getElementById('evSidebar');
    this.el.backdrop   = document.getElementById('evSidebarBackdrop');
    this.el.main       = document.getElementById('evMain');
    this.el.toggleBtns = document.querySelectorAll('#evSidebarToggle, .ev-sidebar-toggle');

    if (!this.el.sidebar) return;

    this.checkViewport();
    this.restoreState();
    this.bindEvents();
    this.setActiveNavItem();
  },

  /* ─── Viewport ─── */
  checkViewport() {
    this.isMobile = window.innerWidth < this.breakpoint;
  },

  /* ─── Restore from localStorage ─── */
  restoreState() {
    if (this.isMobile) {
      this.unpin(false);
    } else {
      const saved = localStorage.getItem('ev_sidebar_pinned');
      if (saved === 'true') {
        this.pin(false);
      } else {
        this.unpin(false);
      }
    }
  },

  /* ─── Toggle (debounced) ─── */
  toggle() {
    const now = Date.now();
    if (now - this._lastToggle < 220) return;
    this._lastToggle = now;

    if (this.isPinned) {
      this.unpin(true);
    } else {
      this.pin(true);
    }
  },

  /* ─── Pin Open ─── */
  pin(persist) {
    this.isPinned = true;
    const { sidebar, backdrop } = this.el;

    if (sidebar) {
      sidebar.classList.add('ev-sidebar--pinned');
      sidebar.classList.remove('ev-sidebar--hover');
    }
    document.body.classList.add('ev-sidebar-pinned');

    if (this.isMobile && backdrop) {
      backdrop.classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    if (persist && !this.isMobile) {
      localStorage.setItem('ev_sidebar_pinned', 'true');
    }
  },

  /* ─── Unpin / Collapse ─── */
  unpin(persist) {
    this.isPinned = false;
    const { sidebar, backdrop } = this.el;

    if (sidebar) {
      sidebar.classList.remove('ev-sidebar--pinned', 'ev-sidebar--hover');
    }
    document.body.classList.remove('ev-sidebar-pinned');

    if (backdrop) {
      backdrop.classList.remove('active');
      document.body.style.overflow = '';
    }

    if (persist && !this.isMobile) {
      localStorage.setItem('ev_sidebar_pinned', 'false');
    }
  },

  /* ─── Hover expand/collapse (desktop, unpinned only) ─── */
  onMouseEnter() {
    if (!this.isPinned && !this.isMobile) {
      this.el.sidebar.classList.add('ev-sidebar--hover');
    }
  },

  onMouseLeave() {
    if (!this.isPinned && !this.isMobile) {
      this.el.sidebar.classList.remove('ev-sidebar--hover');
    }
  },

  /* ─── Active nav highlight ─── */
  setActiveNavItem() {
    const path = window.location.pathname.toLowerCase();
    const links = document.querySelectorAll('.ev-nav-item');

    links.forEach(link => {
      const href = (link.getAttribute('href') || '').toLowerCase();
      const match = (path === '/' && href === '/') ||
                    (href !== '/' && path.startsWith(href));
      link.classList.toggle('active', match);
      if (match) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  },

  /* ─── Event Bindings ─── */
  bindEvents() {
    // Toggle buttons
    this.el.toggleBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggle();
      });
    });

    // Hover expand (desktop)
    if (this.el.sidebar) {
      this.el.sidebar.addEventListener('mouseenter', () => this.onMouseEnter());
      this.el.sidebar.addEventListener('mouseleave', () => this.onMouseLeave());
    }

    // Backdrop click (mobile)
    if (this.el.backdrop) {
      this.el.backdrop.addEventListener('click', () => {
        if (this.isMobile) this.unpin(false);
      });
    }

    // ESC key (mobile)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isMobile && this.isPinned) {
        this.unpin(false);
      }
    });

    // Resize
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const wasMobile = this.isMobile;
        this.checkViewport();

        if (wasMobile !== this.isMobile) {
          if (this.isMobile) {
            this.unpin(false);
          } else {
            const saved = localStorage.getItem('ev_sidebar_pinned');
            if (saved === 'true') this.pin(false);
            else this.unpin(false);
          }
        }
      }, 150);
    });
  }
};

window.Sidebar = Sidebar;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Sidebar.init());
} else {
  Sidebar.init();
}
