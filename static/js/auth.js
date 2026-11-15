/**
 * ====================================================================
 * AURA LUXURY REAL ESTATE — AUTHENTICATION & MULTI-STEP FLOWS
 * File: static/js/auth.js
 * ====================================================================
 */

'use strict';

const Auth = {
  currentStep: 1,
  totalSteps: 3,
  selectedRole: 'buyer',
  formData: {},
  isSubmitting: false,

  /**
   * Initialize Authentication Module
   */
  init() {
    this.bindForms();
    this.bindMultiStep();
    this.bindRoleSelection();
    this.bindPasswordStrength();
    this.bindPasswordToggles();
    this.bindSocialButtons();
    this.bindRealtimeValidation();
  },

  initLogin() {
    this.init();
  },

  initSignup() {
    this.init();
  },

  /**
   * Bind Login and Registration Form Submissions
   */
  bindForms() {
    const loginForm = document.getElementById('loginForm') || document.getElementById('login-form') || document.querySelector('form[data-auth="login"]');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    const signupForm = document.getElementById('signupForm') || document.getElementById('signup-form') || document.querySelector('form[data-auth="signup"]');
    if (signupForm) {
      signupForm.addEventListener('submit', (e) => this.handleSignup(e));
    }
  },

  /**
   * 1. LOGIN HANDLER
   * Handles user credential submission to Flask backend
   */
  async handleLogin(e) {
    e.preventDefault();
    if (this.isSubmitting) return;

    const form = e.target;
    const emailInput = form.querySelector('input[type="email"], [name="email"]');
    const passwordInput = form.querySelector('input[type="password"], [name="password"]');
    const submitBtn = form.querySelector('button[type="submit"]');

    if (!emailInput || !passwordInput) {
      form.submit();
      return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    let hasError = false;

    // Validate Email
    if (!this.validateEmail(email)) {
      this.showFieldError(emailInput, 'Please provide a valid email address.');
      hasError = true;
    } else {
      this.clearFieldError(emailInput);
    }

    // Validate Password presence
    if (!password) {
      this.showFieldError(passwordInput, 'Please enter your password.');
      hasError = true;
    } else {
      this.clearFieldError(passwordInput);
    }

    if (hasError) return;

    this.setButtonLoading(submitBtn, true, 'Verifying Credentials...');

    try {
      let response;
      if (window.App && typeof window.App.api === 'function') {
        response = await window.App.api('/api/auth/login', {
          method: 'POST',
          body: { email, password }
        });
      } else {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        response = await res.json();
      }

      if (response && response.success !== false) {
        if (window.App) {
          window.App.state.user = response.user || { email };
          window.App.showToast(`Welcome back${response.user?.full_name ? `, ${response.user.full_name}` : ''}!`, 'success', 2500);
        }

        setTimeout(() => {
          window.location.href = response.redirect || '/dashboard';
        }, 600);
      } else {
        throw new Error(response.message || response.error || 'Invalid email or password.');
      }
    } catch (err) {
      this.setButtonLoading(submitBtn, false, 'Sign In');
      this.showFieldError(passwordInput, err.message || 'Authentication failed. Please verify credentials.');
      // If JS fetch had a problem, allow native form submit as fallback
      console.warn('AJAX login failed, form fallback available:', err);
    }
  },

  /**
   * 2. MULTI-STEP SIGNUP NAVIGATION
   */
  bindMultiStep() {
    const nextBtns = document.querySelectorAll('.btn-next-step, [data-next-step]');
    nextBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.nextStep();
      });
    });

    const prevBtns = document.querySelectorAll('.btn-prev-step, [data-prev-step]');
    prevBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.prevStep();
      });
    });
  },

  /**
   * Advance to Next Step in Registration Flow
   */
  nextStep() {
    if (!this.validateCurrentStep(this.currentStep)) {
      return;
    }

    if (this.currentStep < this.totalSteps) {
      const currentEl = document.querySelector(`.signup-step[data-step="${this.currentStep}"]`);
      this.currentStep++;
      const nextEl = document.querySelector(`.signup-step[data-step="${this.currentStep}"]`);

      this.transitionSteps(currentEl, nextEl, 'forward');
      this.updateStepProgress();
    }
  },

  /**
   * Return to Previous Step
   */
  prevStep() {
    if (this.currentStep > 1) {
      const currentEl = document.querySelector(`.signup-step[data-step="${this.currentStep}"]`);
      this.currentStep--;
      const prevEl = document.querySelector(`.signup-step[data-step="${this.currentStep}"]`);

      this.transitionSteps(currentEl, prevEl, 'backward');
      this.updateStepProgress();
    }
  },

  /**
   * Step Visual Transition Animation
   */
  transitionSteps(outgoingEl, incomingEl, direction = 'forward') {
    if (!outgoingEl || !incomingEl) return;

    if (typeof gsap !== 'undefined') {
      const outX = direction === 'forward' ? -40 : 40;
      const inX = direction === 'forward' ? 40 : -40;

      gsap.to(outgoingEl, {
        opacity: 0,
        x: outX,
        duration: 0.25,
        ease: 'power2.in',
        onComplete: () => {
          outgoingEl.style.display = 'none';
          incomingEl.style.display = 'block';
          gsap.fromTo(incomingEl,
            { opacity: 0, x: inX },
            { opacity: 1, x: 0, duration: 0.35, ease: 'power2.out' }
          );
        }
      });
    } else {
      outgoingEl.style.display = 'none';
      incomingEl.style.display = 'block';
    }
  },

  /**
   * Update Progress Dots and Indicators
   */
  updateStepProgress() {
    const dots = document.querySelectorAll('.step-indicator-dot, [data-indicator-step]');
    dots.forEach((dot, index) => {
      const stepIndex = index + 1;
      if (stepIndex <= this.currentStep) {
        dot.classList.add('active', 'completed');
      } else {
        dot.classList.remove('active', 'completed');
      }
    });

    const progressBar = document.querySelector('.signup-progress-bar-fill');
    if (progressBar) {
      const progressPercent = ((this.currentStep - 1) / (this.totalSteps - 1)) * 100;
      progressBar.style.width = `${progressPercent}%`;
    }

    const stepLabel = document.querySelector('.step-count-label');
    if (stepLabel) {
      stepLabel.textContent = `Step ${this.currentStep} of ${this.totalSteps}`;
    }
  },

  /**
   * Role Selection Cards (Buyer, Investor, Broker/Agent, Developer)
   */
  bindRoleSelection() {
    const roleCards = document.querySelectorAll('.role-card, [data-role]');
    roleCards.forEach(card => {
      card.addEventListener('click', () => {
        const role = card.getAttribute('data-role') || 'buyer';
        this.selectRole(role);
      });
    });
  },

  selectRole(role) {
    this.selectedRole = role;

    const roleCards = document.querySelectorAll('.role-card, [data-role]');
    roleCards.forEach(card => {
      if (card.getAttribute('data-role') === role) {
        card.classList.add('selected', 'active');
        card.style.borderColor = '#D4AF37';
        card.style.boxShadow = '0 0 20px rgba(212, 175, 55, 0.25)';
      } else {
        card.classList.remove('selected', 'active');
        card.style.borderColor = 'rgba(255, 255, 255, 0.08)';
        card.style.boxShadow = 'none';
      }
    });

    // Update hidden input if present
    const hiddenRole = document.getElementById('selected-role-input') || document.querySelector('input[name="role"]');
    if (hiddenRole) {
      hiddenRole.value = role;
    }
  },

  /**
   * Validate Fields for a Specific Step
   */
  validateCurrentStep(step) {
    const container = document.querySelector(`.signup-step[data-step="${step}"]`);
    if (!container) return true;

    let valid = true;

    if (step === 1) {
      // Step 1: Email & Password
      const email = container.querySelector('input[type="email"], [name="email"]');
      const password = container.querySelector('input[type="password"], [name="password"]');
      const confirmPassword = container.querySelector('input[name="confirm_password"], [name="password_confirm"]');

      if (email && !this.validateEmail(email.value.trim())) {
        this.showFieldError(email, 'Please enter a valid email address.');
        valid = false;
      } else if (email) {
        this.clearFieldError(email);
      }

      if (password) {
        const passCheck = this.validatePassword(password.value);
        if (!passCheck.valid) {
          this.showFieldError(password, passCheck.message);
          valid = false;
        } else {
          this.clearFieldError(password);
        }
      }

      if (confirmPassword && password && confirmPassword.value !== password.value) {
        this.showFieldError(confirmPassword, 'Passwords do not match.');
        valid = false;
      } else if (confirmPassword) {
        this.clearFieldError(confirmPassword);
      }
    } else if (step === 2) {
      // Step 2: Role Selection
      if (!this.selectedRole) {
        if (window.App) window.App.showToast('Please select your platform role to continue.', 'warning');
        valid = false;
      }
    } else if (step === 3) {
      // Step 3: Full Name, Phone & Company
      const name = container.querySelector('input[name="full_name"], input[name="name"]');
      if (name && name.value.trim().length < 2) {
        this.showFieldError(name, 'Please enter your full name (at least 2 characters).');
        valid = false;
      } else if (name) {
        this.clearFieldError(name);
      }
    }

    return valid;
  },

  /**
   * 3. SIGNUP SUBMIT HANDLER
   * Posts comprehensive user details to /api/auth/signup
   */
  async handleSignup(e) {
    e.preventDefault();
    if (this.isSubmitting) return;

    if (!this.validateCurrentStep(this.currentStep)) return;

    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');

    // Extract all fields
    const fullNameInput = form.querySelector('[name="full_name"], [name="name"]');
    const emailInput = form.querySelector('[name="email"]');
    const passwordInput = form.querySelector('[name="password"]');
    const companyInput = form.querySelector('[name="company"]');
    const phoneInput = form.querySelector('[name="phone"]');

    const payload = {
      full_name: fullNameInput ? fullNameInput.value.trim() : '',
      email: emailInput ? emailInput.value.trim() : '',
      password: passwordInput ? passwordInput.value : '',
      role: this.selectedRole || 'buyer',
      company: companyInput ? companyInput.value.trim() : '',
      phone: phoneInput ? phoneInput.value.trim() : ''
    };

    this.setButtonLoading(submitBtn, true, 'Creating Elite Account...');

    try {
      let response;
      if (window.App && typeof window.App.api === 'function') {
        response = await window.App.api('/api/auth/signup', {
          method: 'POST',
          body: payload
        });
      } else {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(payload)
        });
        response = await res.json();
      }

      if (response && response.success !== false) {
        if (window.App) {
          window.App.state.user = response.user || payload;
          window.App.showToast('Welcome to EstateVision! Your account has been initialized.', 'success', 3000);
        }

        // Show success animation checkmark
        this.showSignupSuccess();

        setTimeout(() => {
          window.location.href = response.redirect || '/dashboard';
        }, 800);
      } else {
        throw new Error(response.message || response.error || 'Unable to complete registration.');
      }
    } catch (err) {
      this.setButtonLoading(submitBtn, false, 'Complete Registration');
      if (window.App) {
        window.App.showToast(err.message || 'Signup failed. Please verify your details.', 'error');
      }
      console.warn('Signup error, submitting natively as fallback');
      form.submit();
    }
  },

  /**
   * Display Confetti / Checkmark Success Overlay
   */
  showSignupSuccess() {
    const formContainer = document.querySelector('.auth-form-container') || document.querySelector('.signup-box');
    if (!formContainer) return;

    const overlay = document.createElement('div');
    overlay.className = 'auth-success-overlay';
    overlay.style.cssText = `
      position: absolute;
      inset: 0;
      background: rgba(10, 10, 15, 0.95);
      backdrop-filter: blur(12px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      z-index: 100;
      border-radius: inherit;
      animation: fadeIn 0.4s ease;
    `;

    overlay.innerHTML = `
      <div style="
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: rgba(212, 175, 55, 0.15);
        border: 2px solid #D4AF37;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 30px rgba(212, 175, 55, 0.4);
      ">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#F5D76E" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <h3 style="font-family: 'Playfair Display', serif; color: #F1F5F9; font-size: 22px; margin: 0;">Access Granted</h3>
      <p style="color: #94A3B8; font-size: 14px; margin: 0;">Configuring your luxury portfolio...</p>
    `;

    formContainer.style.position = formContainer.style.position || 'relative';
    formContainer.appendChild(overlay);
  },

  /**
   * Form Validation Helpers
   */
  validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  },

  validatePassword(password) {
    if (!password || password.length < 8) {
      return { valid: false, score: 1, message: 'Password must be at least 8 characters long.' };
    }

    let score = 0;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score < 2) {
      return { valid: false, score, message: 'Include a mix of uppercase letters and numbers.' };
    }

    return { valid: true, score: Math.min(score, 4), message: 'Password criteria met.' };
  },

  /**
   * Dynamic Field Error Display
   */
  showFieldError(field, message) {
    if (!field) return;

    field.classList.add('is-invalid');
    field.style.borderColor = '#EF4444';
    field.style.boxShadow = '0 0 10px rgba(239, 68, 68, 0.25)';

    const parent = field.closest('.form-group, .input-wrap') || field.parentElement;
    let errorEl = parent.querySelector('.field-error-message');

    if (!errorEl) {
      errorEl = document.createElement('div');
      errorEl.className = 'field-error-message';
      errorEl.style.cssText = `
        color: #F87171;
        font-size: 12px;
        margin-top: 6px;
        display: flex;
        align-items: center;
        gap: 6px;
        font-family: 'Inter', sans-serif;
        animation: fadeIn 0.2s ease;
      `;
      parent.appendChild(errorEl);
    }

    errorEl.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
      <span>${message}</span>
    `;
  },

  clearFieldError(field) {
    if (!field) return;

    field.classList.remove('is-invalid');
    field.style.borderColor = '';
    field.style.boxShadow = '';

    const parent = field.closest('.form-group, .input-wrap') || field.parentElement;
    const errorEl = parent.querySelector('.field-error-message');
    if (errorEl) {
      errorEl.remove();
    }
  },

  /**
   * Realtime Validation on Blur
   */
  bindRealtimeValidation() {
    const inputs = document.querySelectorAll('.form-control, .input-luxury');
    inputs.forEach(input => {
      input.addEventListener('blur', () => {
        const type = input.getAttribute('type');
        const name = input.getAttribute('name');

        if (type === 'email' || name === 'email') {
          if (input.value && !this.validateEmail(input.value)) {
            this.showFieldError(input, 'Invalid email format.');
          } else {
            this.clearFieldError(input);
          }
        }
      });

      input.addEventListener('input', () => {
        if (input.classList.contains('is-invalid')) {
          this.clearFieldError(input);
        }
      });
    });
  },

  /**
   * Password Strength Bar Indicator
   */
  bindPasswordStrength() {
    const passwordInputs = document.querySelectorAll('input[type="password"][name="password"], #signup-password');
    passwordInputs.forEach(input => {
      input.addEventListener('input', (e) => {
        this.updatePasswordStrength(e.target.value);
      });
    });
  },

  updatePasswordStrength(password) {
    const bar = document.querySelector('.password-strength-fill, [data-strength-bar]');
    const label = document.querySelector('.password-strength-label, [data-strength-label]');
    if (!bar) return;

    if (!password) {
      bar.style.width = '0%';
      bar.style.backgroundColor = 'transparent';
      if (label) label.textContent = '';
      return;
    }

    const { score } = this.validatePassword(password);
    let width = '25%';
    let color = '#EF4444';
    let text = 'Weak';

    if (score === 2) {
      width = '50%';
      color = '#F59E0B';
      text = 'Fair';
    } else if (score === 3) {
      width = '75%';
      color = '#38BDF8';
      text = 'Good';
    } else if (score >= 4) {
      width = '100%';
      color = '#D4AF37';
      text = 'Elite & Secure';
    }

    bar.style.width = width;
    bar.style.backgroundColor = color;
    bar.style.boxShadow = `0 0 10px ${color}88`;
    bar.style.transition = 'all 0.3s ease';

    if (label) {
      label.textContent = text;
      label.style.color = color;
    }
  },

  /**
   * Password Visibility Eye Toggle
   */
  bindPasswordToggles() {
    const toggles = document.querySelectorAll('.toggle-password, [data-toggle-password]');
    toggles.forEach(toggle => {
      toggle.addEventListener('click', () => {
        const targetId = toggle.getAttribute('data-target');
        const input = targetId ? document.getElementById(targetId) : toggle.parentElement.querySelector('input');
        if (!input) return;

        const isPassword = input.getAttribute('type') === 'password';
        input.setAttribute('type', isPassword ? 'text' : 'password');

        // Toggle icon state
        toggle.classList.toggle('is-visible', isPassword);
        const eyeIcon = toggle.querySelector('svg');
        if (eyeIcon) {
          if (isPassword) {
            eyeIcon.innerHTML = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>`;
          } else {
            eyeIcon.innerHTML = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>`;
          }
        }
      });
    });
  },

  /**
   * Social OAuth Handlers (Google, Apple, Microsoft)
   */
  bindSocialButtons() {
    const socialBtns = document.querySelectorAll('.social-login-btn, [data-social-provider]');
    socialBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const provider = btn.getAttribute('data-social-provider') || btn.innerText.trim();
        this.handleSocialLogin(provider);
      });
    });
  },

  handleSocialLogin(provider) {
    if (window.App && typeof window.App.showToast === 'function') {
      window.App.showToast(`${provider} enterprise single sign-on is scheduled for deployment.`, 'info', 3500);
    }
  },

  /**
   * Submit Button Loading State Manager
   */
  setButtonLoading(btn, isLoading, label = '') {
    if (!btn) return;
    this.isSubmitting = isLoading;
    btn.disabled = isLoading;

    if (isLoading) {
      btn.setAttribute('data-original-text', btn.innerHTML);
      btn.innerHTML = `
        <span style="display: inline-flex; align-items: center; gap: 8px;">
          <span class="btn-spinner" style="
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255,255,255,0.3);
            border-top-color: #D4AF37;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          "></span>
          <span>${label || 'Processing...'}</span>
        </span>
      `;
    } else {
      const original = btn.getAttribute('data-original-text');
      btn.innerHTML = original || label || 'Submit';
    }
  }
};

// Expose globally
window.Auth = Auth;

// Auto-run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Auth.init());
} else {
  Auth.init();
}
