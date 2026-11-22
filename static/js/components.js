/**
 * ====================================================================
 * ESTATEVISION — SHARED COMPONENT CONTROLLERS
 * File: static/js/components.js
 * Toast, Modal, Drawer, CurrencySwitcher, Skeleton, Concierge (Cmd+K)
 * ====================================================================
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════════════
   1. TOAST SYSTEM
   ═══════════════════════════════════════════════════════════════════════ */
const Toast = {
  maxVisible: 5,

  _icons: {
    success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error:   '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info:    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  },

  show(message, type = 'info', duration = 4000) {
    let container = document.getElementById('evToastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'evToastContainer';
      container.className = 'ev-toast-container';
      document.body.appendChild(container);
    }

    const existing = container.querySelectorAll('.ev-toast');
    if (existing.length >= this.maxVisible) {
      this._remove(existing[0]);
    }

    const toast = document.createElement('div');
    toast.className = `ev-toast ev-toast--${type}`;

    toast.innerHTML = `
      <div class="ev-toast-icon">${this._icons[type] || this._icons.info}</div>
      <div class="ev-toast-message">${message}</div>
      <button class="ev-toast-close" aria-label="Close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <div class="ev-toast-progress" style="transition-duration: ${duration}ms;"></div>
    `;

    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('show');
      const progress = toast.querySelector('.ev-toast-progress');
      if (progress) {
        requestAnimationFrame(() => { progress.style.width = '0%'; });
      }
    });

    const closeBtn = toast.querySelector('.ev-toast-close');
    closeBtn.addEventListener('click', () => this._remove(toast));

    const timer = setTimeout(() => this._remove(toast), duration);
    toast._timer = timer;
  },

  _remove(toast) {
    if (!toast || !toast.parentNode) return;
    clearTimeout(toast._timer);
    toast.classList.remove('show');
    toast.classList.add('removing');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  },

  success(msg, dur) { this.show(msg, 'success', dur); },
  error(msg, dur)   { this.show(msg, 'error', dur); },
  warning(msg, dur) { this.show(msg, 'warning', dur); },
  info(msg, dur)    { this.show(msg, 'info', dur); }
};

window.Toast = Toast;


/* ═══════════════════════════════════════════════════════════════════════
   2. MODAL SYSTEM
   ═══════════════════════════════════════════════════════════════════════ */
const Modal = {
  _overlay: null,
  _onClose: null,

  open({ title = '', content = '', actions = [], onClose = null } = {}) {
    this.close();

    const overlay = document.createElement('div');
    overlay.className = 'ev-modal-overlay';

    const actionsHTML = actions.map(a =>
      `<button class="${a.primary ? 'ev-btn-primary ev-btn-sm' : 'ev-btn-secondary ev-btn-sm'}" data-action="${a.label}">${a.label}</button>`
    ).join('');

    overlay.innerHTML = `
      <div class="ev-modal" role="dialog" aria-modal="true" aria-label="${title}">
        <div class="ev-modal-header">
          <h3 class="ev-modal-title">${title}</h3>
          <button class="ev-btn-icon ev-modal-close" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="ev-modal-body">${content}</div>
        ${actionsHTML ? `<div class="ev-modal-footer">${actionsHTML}</div>` : ''}
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    this._overlay = overlay;
    this._onClose = onClose;

    requestAnimationFrame(() => overlay.classList.add('active'));

    overlay.querySelector('.ev-modal-close').addEventListener('click', () => this.close());

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    });

    this._escHandler = (e) => { if (e.key === 'Escape') this.close(); };
    document.addEventListener('keydown', this._escHandler);

    actions.forEach(a => {
      const btn = overlay.querySelector(`[data-action="${a.label}"]`);
      if (btn && a.onClick) {
        btn.addEventListener('click', () => {
          a.onClick();
          if (a.primary !== false) this.close();
        });
      }
    });
  },

  close() {
    if (!this._overlay) return;
    this._overlay.classList.remove('active');
    const overlay = this._overlay;
    setTimeout(() => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 300);
    document.body.style.overflow = '';
    if (this._escHandler) document.removeEventListener('keydown', this._escHandler);
    if (this._onClose) this._onClose();
    this._overlay = null;
    this._onClose = null;
  },

  confirm({ title = 'Confirm', message = '', confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm = null } = {}) {
    this.open({
      title,
      content: `<p>${message}</p>`,
      actions: [
        { label: cancelLabel, primary: false, onClick: () => this.close() },
        { label: confirmLabel, primary: true, onClick: () => { if (onConfirm) onConfirm(); } }
      ]
    });
  }
};

window.Modal = Modal;


/* ═══════════════════════════════════════════════════════════════════════
   3. DRAWER SYSTEM
   ═══════════════════════════════════════════════════════════════════════ */
const Drawer = {
  _drawer: null,
  _drawerOverlay: null,

  open({ title = '', content = '', width = 400, side = 'right' } = {}) {
    this.close();

    const overlay = document.createElement('div');
    overlay.className = 'ev-drawer-overlay';

    const drawer = document.createElement('div');
    drawer.className = 'ev-drawer';
    drawer.style.width = width + 'px';
    if (side === 'left') {
      drawer.style.right = 'auto';
      drawer.style.left = '0';
      drawer.style.borderLeft = 'none';
      drawer.style.borderRight = '1px solid var(--ev-border-hairline)';
      drawer.style.transform = 'translateX(-100%)';
    }

    drawer.innerHTML = `
      <div class="ev-drawer-header">
        <h3 class="ev-modal-title">${title}</h3>
        <button class="ev-btn-icon ev-drawer-close" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="ev-drawer-body">${content}</div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);
    this._drawer = drawer;
    this._drawerOverlay = overlay;

    requestAnimationFrame(() => {
      overlay.classList.add('active');
      drawer.classList.add('active');
    });

    overlay.addEventListener('click', () => this.close());
    drawer.querySelector('.ev-drawer-close').addEventListener('click', () => this.close());
    document.addEventListener('keydown', this._onEsc = (e) => { if (e.key === 'Escape') this.close(); });
  },

  close() {
    if (this._drawer) {
      this._drawer.classList.remove('active');
      setTimeout(() => { if (this._drawer?.parentNode) this._drawer.parentNode.removeChild(this._drawer); this._drawer = null; }, 300);
    }
    if (this._drawerOverlay) {
      this._drawerOverlay.classList.remove('active');
      setTimeout(() => { if (this._drawerOverlay?.parentNode) this._drawerOverlay.parentNode.removeChild(this._drawerOverlay); this._drawerOverlay = null; }, 300);
    }
    if (this._onEsc) { document.removeEventListener('keydown', this._onEsc); this._onEsc = null; }
  }
};

window.Drawer = Drawer;


/* ═══════════════════════════════════════════════════════════════════════
   4. CURRENCY SWITCHER
   ═══════════════════════════════════════════════════════════════════════ */
const CurrencySwitcher = {
  current: 'USD',

  rates: {
    USD: 1, EUR: 0.92, GBP: 0.79, AED: 3.67, VND: 24850,
    JPY: 149.5, CHF: 0.88, AUD: 1.53, CAD: 1.36,
    SGD: 1.34, CNY: 7.24, INR: 83.1
  },

  symbols: {
    USD: '$', EUR: '€', GBP: '£', AED: 'AED ',
    VND: '₫', JPY: '¥', CHF: 'CHF ', AUD: 'A$',
    CAD: 'C$', SGD: 'S$', CNY: '¥', INR: '₹'
  },

  names: {
    USD: 'US Dollar', EUR: 'Euro', GBP: 'British Pound', AED: 'UAE Dirham',
    VND: 'Vietnamese Dong', JPY: 'Japanese Yen', CHF: 'Swiss Franc', AUD: 'Australian Dollar',
    CAD: 'Canadian Dollar', SGD: 'Singapore Dollar', CNY: 'Chinese Yuan', INR: 'Indian Rupee'
  },

  init() {
    const saved = localStorage.getItem('ev_currency');
    if (saved && this.rates[saved]) {
      this.current = saved;
    }
    this.updateAll();
  },

  setCurrency(code) {
    if (!this.rates[code]) return;
    this.current = code;
    localStorage.setItem('ev_currency', code);
    this.updateAll();

    document.querySelectorAll('.ev-currency-code-display').forEach(el => {
      el.textContent = code;
    });

    document.querySelectorAll('.ev-currency-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.currency === code);
    });

    if (window.Toast) Toast.show(`Currency converted to ${code} (${this.names[code]})`, 'info', 2000);
  },

  convert(amountUSD) {
    return amountUSD * (this.rates[this.current] || 1);
  },

  formatPrice(amountUSD) {
    const converted = this.convert(amountUSD);
    const sym = this.symbols[this.current] || '$';
    const abs = Math.abs(converted);

    if (abs >= 1e9) return `${sym}${(converted / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `${sym}${(converted / 1e6).toFixed(2)}M`;
    if (abs >= 1e3) return `${sym}${(converted / 1e3).toFixed(0)}K`;
    return `${sym}${converted.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  },

  updateAll() {
    document.querySelectorAll('[data-price-usd]').forEach(el => {
      const usd = parseFloat(el.dataset.priceUsd);
      if (!isNaN(usd)) {
        el.textContent = this.formatPrice(usd);
      }
    });
  }
};

window.CurrencySwitcher = CurrencySwitcher;


/* ═══════════════════════════════════════════════════════════════════════
   5. SKELETON LOADER MANAGER
   ═══════════════════════════════════════════════════════════════════════ */
const Skeleton = {
  show(container) {
    if (!container) return;
    container.dataset.skeletonContent = container.innerHTML;
    container.classList.add('ev-skeleton-active');
  },

  hide(container) {
    if (!container) return;
    container.classList.remove('ev-skeleton-active');
    if (container.dataset.skeletonContent) {
      delete container.dataset.skeletonContent;
    }
  },

  card(count = 3) {
    let html = '';
    for (let i = 0; i < count; i++) {
      html += `
        <div class="ev-property-card ev-property-card--skeleton">
          <div class="ev-card-image ev-skeleton ev-skeleton-image"></div>
          <div class="ev-card-body">
            <div class="ev-skeleton ev-skeleton-text ev-skeleton-price" style="width:120px;height:24px;"></div>
            <div class="ev-skeleton ev-skeleton-text ev-skeleton-title" style="width:80%;height:16px;"></div>
            <div class="ev-skeleton-stats" style="display:flex;gap:20px;">
              <div class="ev-skeleton ev-skeleton-text" style="width:48px;height:14px;"></div>
              <div class="ev-skeleton ev-skeleton-text" style="width:48px;height:14px;"></div>
              <div class="ev-skeleton ev-skeleton-text" style="width:48px;height:14px;"></div>
            </div>
          </div>
        </div>`;
    }
    return html;
  }
};

window.Skeleton = Skeleton;


/* ═══════════════════════════════════════════════════════════════════════
   6. CONCIERGE AI COMMAND BAR (Cmd+K / Ctrl+K)
   ═══════════════════════════════════════════════════════════════════════ */
const Concierge = {
  _overlay: null,

  init() {
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.toggle();
      }
    });
  },

  toggle() {
    if (this._overlay) {
      this.close();
    } else {
      this.open();
    }
  },

  open() {
    this.close();

    const overlay = document.createElement('div');
    overlay.className = 'ev-modal-overlay ev-concierge-overlay';
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(8px);
      z-index: 99999;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 15vh;
    `;

    const commands = (window.MockData && MockData.conciergeCommands) || [
      { id: '1', title: 'Browse Marketplace (144k+ listings)', category: 'Marketplace', url: '/buy' },
      { id: '2', title: 'Open 3D Geospatial Globe', category: 'Analytics', url: '/explore' },
      { id: '3', title: 'View 100-Year BIS Sovereign Housing Index (1927–2026)', category: 'Macro Data', url: '/global' },
      { id: '4', title: 'Cross-Market Sovereign Arbitrage Benchmark', category: 'Intelligence', url: '/compare' },
      { id: '5', title: 'List a Sovereign Residence with JPG media', category: 'Sell', url: '/sell' },
      { id: '6', title: 'Executive Portfolio Dashboard & Escrows', category: 'Account', url: '/dashboard' },
      { id: '7', title: 'Switch Perspective: Lord Alexander Vance (Broker)', category: 'Demo', url: '/demo-login/agent' },
      { id: '8', title: 'Switch Perspective: Elena Rostova (Investor)', category: 'Demo', url: '/demo-login/investor' }
    ];

    const commandsHTML = commands.map(c => `
      <a href="${c.url}" class="ev-command-item" style="
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-radius: 8px;
        color: #F5F5F7;
        text-decoration: none;
        transition: background 0.15s;
        font-size: 14px;
      ">
        <span>${c.title}</span>
        <span style="font-size: 11px; text-transform: uppercase; color: var(--ev-gold); background: var(--ev-gold-subtle); padding: 3px 8px; border-radius: 4px;">${c.category}</span>
      </a>
    `).join('');

    overlay.innerHTML = `
      <div class="ev-modal ev-glass" style="
        width: 100%;
        max-width: 600px;
        border-radius: 16px;
        box-shadow: 0 24px 60px rgba(0,0,0,0.8);
        overflow: hidden;
      ">
        <div style="display: flex; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--ev-border-hairline); gap: 12px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ev-gold)" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input 
            type="text" 
            id="evConciergeInput" 
            placeholder="Type a command, city, or feature... (e.g. 'Dubai', 'Escrow', 'Globe')"
            style="
              flex: 1;
              background: none;
              border: none;
              outline: none;
              color: #F5F5F7;
              font-size: 16px;
              font-family: inherit;
            "
          >
          <kbd style="font-size: 11px; padding: 3px 6px; background: var(--ev-bg-elevated); border: 1px solid var(--ev-border-hairline); border-radius: 4px; color: var(--ev-text-muted);">ESC</kbd>
        </div>
        <div id="evCommandList" style="padding: 10px; max-height: 380px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px;">
          ${commandsHTML}
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this._overlay = overlay;

    const input = overlay.querySelector('#evConciergeInput');
    input.focus();

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    });

    document.addEventListener('keydown', this._escListener = (e) => {
      if (e.key === 'Escape') this.close();
    });

    // Instant filter inside command bar
    input.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      overlay.querySelectorAll('.ev-command-item').forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(q) ? 'flex' : 'none';
      });
    });

    // Hover effect
    overlay.querySelectorAll('.ev-command-item').forEach(item => {
      item.addEventListener('mouseenter', () => { item.style.background = 'var(--ev-bg-hover)'; });
      item.addEventListener('mouseleave', () => { item.style.background = 'transparent'; });
    });
  },

  close() {
    if (this._overlay) {
      if (this._overlay.parentNode) this._overlay.parentNode.removeChild(this._overlay);
      this._overlay = null;
    }
    if (this._escListener) {
      document.removeEventListener('keydown', this._escListener);
      this._escListener = null;
    }
  }
};

window.Concierge = Concierge;

// Auto init on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    CurrencySwitcher.init();
    Concierge.init();
  });
} else {
  CurrencySwitcher.init();
  Concierge.init();
}
