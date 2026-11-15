/**
 * ====================================================================
 * AURA LUXURY REAL ESTATE — SIDEBAR CONTROLLER & NAVIGATION
 * File: static/js/sidebar.js
 * ====================================================================
 */

'use strict';

const Sidebar = {
  isOpen: true,
  isMobile: false,
  breakpoint: 1024,
  elements: {},
  countries: [],

  /**
   * Initialize Sidebar Subsystem
   */
  init() {
    this.cacheElements();
    this.checkViewport();
    this.restoreState();
    this.bindEvents();
    this.setActiveNavItem();
    this.initCountrySearch();
  },

  /**
   * Cache DOM Element References
   */
  cacheElements() {
    this.elements = {
      sidebar: document.getElementById('sidebar') || document.querySelector('.app-sidebar'),
      toggleBtns: document.querySelectorAll('#sidebar-toggle, .sidebar-toggle, .btn-sidebar-toggle'),
      overlay: document.getElementById('sidebar-overlay') || document.querySelector('.sidebar-backdrop'),
      mainContent: document.getElementById('main-content') || document.querySelector('.main-content') || document.querySelector('.app-main'),
      countrySearch: document.getElementById('sidebar-country-search') || document.querySelector('[data-country-search]'),
      countryList: document.getElementById('sidebar-country-list') || document.querySelector('.country-nav-list'),
      navLinks: document.querySelectorAll('.sidebar-nav .nav-link, .nav-item a')
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
        transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1);
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
   * Restore Sidebar Open/Closed State from LocalStorage
   */
  restoreState() {
    this.checkViewport();

    if (this.isMobile) {
      this.close(false); // Mobile defaults to closed
    } else {
      const saved = localStorage.getItem('aura_sidebar_open');
      const shouldOpen = saved === null ? true : saved === 'true';
      if (shouldOpen) {
        this.open(false);
      } else {
        this.close(false);
      }
    }
  },

  /**
   * Toggle Sidebar Open / Closed
   */
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  },

  /**
   * Open Sidebar
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
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    if (persist && !this.isMobile) {
      localStorage.setItem('aura_sidebar_open', 'true');
    }

    // Trigger window resize event to smoothly refit Globe and Charts
    this.dispatchResize();
  },

  /**
   * Close Sidebar
   */
  close(persist = true) {
    this.isOpen = false;
    const { sidebar, overlay } = this.elements;

    if (sidebar) {
      sidebar.classList.remove('sidebar-open');
      sidebar.classList.add('collapsed', 'sidebar-closed', 'sidebar-collapsed');
    }

    document.body.classList.remove('sidebar-expanded');
    document.body.classList.add('sidebar-collapsed', 'sidebar-is-collapsed');

    if (overlay) {
      overlay.style.pointerEvents = 'none';
      overlay.style.opacity = '0';
      document.body.style.overflow = '';
    }

    if (persist && !this.isMobile) {
      localStorage.setItem('aura_sidebar_open', 'false');
    }

    this.dispatchResize();
  },

  /**
   * Dispatch smooth layout reflow notification
   */
  dispatchResize() {
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 280);
  },

  /**
   * Highlight Active Navigation Route
   */
  setActiveNavItem() {
    const currentPath = window.location.pathname.toLowerCase();
    const navLinks = document.querySelectorAll('.sidebar-nav a, .nav-item a, .sidebar-menu-link');

    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;

      const linkPath = href.toLowerCase();
      const isMatch = (currentPath === '/' && (linkPath === '/' || linkPath === '/home')) ||
                      (linkPath !== '/' && linkPath !== '#' && currentPath.startsWith(linkPath));

      if (isMatch) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
        const parentItem = link.closest('.nav-item');
        if (parentItem) parentItem.classList.add('active');

        // If inside an accordion submenu, open parent
        const parentSub = link.closest('.nav-submenu');
        if (parentSub) {
          parentSub.classList.add('show');
          const toggle = parentSub.previousElementSibling;
          if (toggle) toggle.classList.add('expanded');
        }
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
    // Toggle Button Clicks
    this.elements.toggleBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggle();
      });
    });

    // Mobile Backdrop Click
    if (this.elements.overlay) {
      this.elements.overlay.addEventListener('click', () => {
        if (this.isMobile) this.close();
      });
    }

    // Keyboard ESC to Close Mobile Sidebar
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isMobile && this.isOpen) {
        this.close();
      }
    });

    // Submenu Accordions
    document.querySelectorAll('.nav-has-sub > .nav-link-toggle').forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        e.preventDefault();
        const submenu = toggle.nextElementSibling;
        if (submenu) {
          submenu.classList.toggle('show');
          toggle.classList.toggle('expanded');
        }
      });
    });

    // Viewport Resize Listener with Debounce
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
            const saved = localStorage.getItem('aura_sidebar_open');
            if (saved !== 'false') this.open(false);
          }
        }
      }, 150);
    });
  },

  /**
   * Country Filter & Quick Search inside Sidebar
   */
  async initCountrySearch() {
    const searchInput = this.elements.countrySearch;
    const countryList = this.elements.countryList;

    if (!searchInput && !countryList) return;

    // Fetch live countries if list container exists but is empty
    if (countryList && countryList.children.length === 0) {
      await this.populateCountryList(countryList);
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        this.filterCountryList(query);
      });
    }
  },

  /**
   * Fetch Countries from Flask API & Populate Sidebar
   */
  async populateCountryList(listEl) {
    try {
      let countries = [];
      if (window.App && typeof window.App.api === 'function') {
        const res = await window.App.api('/api/countries');
        countries = res.countries || res.data || res;
      }

      if (!Array.isArray(countries) || countries.length === 0) {
        countries = [
          'United States', 'United Kingdom', 'United Arab Emirates', 'France',
          'Monaco', 'Japan', 'Singapore', 'Switzerland', 'Australia', 'Italy', 'Canada'
        ];
      }

      this.countries = countries;

      listEl.innerHTML = `
        <li class="country-list-item active" data-country="all">
          <a href="#" class="country-link">
            <span class="country-flag">🌐</span>
            <span class="country-name">All Territories</span>
          </a>
        </li>
      `;

      countries.forEach(country => {
        const li = document.createElement('li');
        li.className = 'country-list-item';
        li.setAttribute('data-country', country);
        li.innerHTML = `
          <a href="#" class="country-link">
            <span class="country-bullet">•</span>
            <span class="country-name">${country}</span>
          </a>
        `;
        listEl.appendChild(li);
      });

      // Bind Country Click Events
      listEl.querySelectorAll('.country-list-item').forEach(item => {
        item.addEventListener('click', (e) => {
          e.preventDefault();
          const country = item.getAttribute('data-country');
          this.selectCountry(country, item);
        });
      });

    } catch (err) {
      console.warn('[Sidebar.populateCountryList] Could not fetch countries:', err);
    }
  },

  /**
   * Live Search Filter for Country Items
   */
  filterCountryList(query) {
    const items = document.querySelectorAll('.country-list-item, [data-country-item]');
    let matchCount = 0;

    items.forEach(item => {
      const country = (item.getAttribute('data-country') || item.textContent).toLowerCase();
      if (!query || country.includes(query) || country === 'all') {
        item.style.display = '';
        matchCount++;
      } else {
        item.style.display = 'none';
      }
    });

    const noResultsEl = document.getElementById('sidebar-country-no-results');
    if (noResultsEl) {
      noResultsEl.style.display = matchCount === 0 ? 'block' : 'none';
    }
  },

  /**
   * Action when a Country is Selected in Sidebar
   */
  selectCountry(country, activeElement = null) {
    // Update active highlight
    document.querySelectorAll('.country-list-item').forEach(el => el.classList.remove('active'));
    if (activeElement) {
      activeElement.classList.add('active');
    }

    if (window.App) {
      window.App.state.activeCountry = country;
    }

    // Interlock with 3D Globe Visualizer if present
    if (window.GlobeViz && typeof window.GlobeViz.filterByCountry === 'function') {
      window.GlobeViz.filterByCountry(country);
    }

    // On mobile, auto close sidebar so user views map/data immediately
    if (this.isMobile) {
      this.close();
    }

    // Fire custom event for any listening analytics/chart widgets
    window.dispatchEvent(new CustomEvent('countrySelected', {
      detail: { country: country }
    }));
  }
};

// Expose globally
window.Sidebar = Sidebar;

// Auto-run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Sidebar.init());
} else {
  Sidebar.init();
}
