/**
 * ====================================================================
 * AURA LUXURY REAL ESTATE — 3D GLOBE VISUALIZER (GLOBE.GL)
 * File: static/js/globe.js
 * ====================================================================
 */

'use strict';

const GlobeViz = {
  globe: null,
  container: null,
  data: [],
  filteredData: [],
  isRotating: true,
  currentHovered: null,

  // Fallback landmarks if API is unavailable or cold-starting
  fallbackData: [
    { city: 'Monaco', country: 'Monaco', lat: 43.7384, lng: 7.4246, price: 14200000, height: 0.45, color: '#F5D76E', bedrooms: 4, area: 380 },
    { city: 'New York', country: 'United States', lat: 40.7128, lng: -74.0060, price: 8900000, height: 0.38, color: '#D4AF37', bedrooms: 3, area: 290 },
    { city: 'London', country: 'United Kingdom', lat: 51.5074, lng: -0.1278, price: 7450000, height: 0.35, color: '#D4AF37', bedrooms: 3, area: 240 },
    { city: 'Dubai', country: 'United Arab Emirates', lat: 25.2048, lng: 55.2708, price: 6200000, height: 0.32, color: '#F5D76E', bedrooms: 4, area: 420 },
    { city: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522, price: 5800000, height: 0.30, color: '#D4AF37', bedrooms: 3, area: 210 },
    { city: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503, price: 5100000, height: 0.28, color: '#E5C158', bedrooms: 2, area: 160 },
    { city: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198, price: 6800000, height: 0.34, color: '#F5D76E', bedrooms: 3, area: 220 },
    { city: 'Hong Kong', country: 'Hong Kong', lat: 22.3193, lng: 114.1694, price: 9800000, height: 0.42, color: '#F5D76E', bedrooms: 2, area: 140 },
    { city: 'Zurich', country: 'Switzerland', lat: 47.3769, lng: 8.5417, price: 6900000, height: 0.34, color: '#D4AF37', bedrooms: 3, area: 250 },
    { city: 'Miami', country: 'United States', lat: 25.7617, lng: -80.1918, price: 4900000, height: 0.26, color: '#38BDF8', bedrooms: 4, area: 350 },
    { city: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093, price: 5400000, height: 0.29, color: '#D4AF37', bedrooms: 3, area: 270 },
    { city: 'Los Angeles', country: 'United States', lat: 34.0522, lng: -118.2437, price: 6500000, height: 0.33, color: '#D4AF37', bedrooms: 5, area: 480 },
    { city: 'Milan', country: 'Italy', lat: 45.4642, lng: 9.1900, price: 4200000, height: 0.24, color: '#38BDF8', bedrooms: 3, area: 190 }
  ],

  /**
   * Initialize Globe Visualizer inside container
   */
  async init(containerId = 'globeViz') {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.warn(`[GlobeViz] Target container #${containerId} not found in DOM.`);
      return;
    }

    if (typeof Globe === 'undefined') {
      console.error('[GlobeViz] Globe.gl library is not loaded. Ensure Globe CDN is included.');
      return;
    }

    // Fetch live sample data from Flask API
    try {
      if (window.App && typeof window.App.api === 'function') {
        const response = await window.App.api('/api/globe-data?sample_size=2500');
        if (response && Array.isArray(response.data) && response.data.length > 0) {
          this.data = response.data;
        } else if (response && Array.isArray(response) && response.length > 0) {
          this.data = response;
        } else {
          this.data = this.fallbackData;
        }
      } else {
        this.data = this.fallbackData;
      }
    } catch (err) {
      console.warn('[GlobeViz] Backend globe data endpoint unavailable. Initializing with curated luxury estate nodes.', err);
      this.data = this.fallbackData;
    }

    this.filteredData = [...this.data];

    // Compute heights and luxury colors if not already present
    this.normalizeData();

    // Create Globe instance
    this.renderGlobe();

    // Setup window resize listener
    window.addEventListener('resize', () => this.handleResize());
  },

  /**
   * Pre-calculate altitudes and gradient color tokens for the 3D data bars
   */
  normalizeData() {
    this.filteredData = this.filteredData.map(d => {
      const price = Number(d.price) || 1000000;
      let height = d.height;
      let color = d.color;

      if (!height) {
        // Height scaled between 0.06 and 0.48
        height = Math.min(Math.max((price / 5000000) * 0.35, 0.08), 0.5);
      }

      if (!color) {
        if (price >= 7000000) {
          color = '#F5D76E'; // Ultra Luxury Bright Gold
        } else if (price >= 3000000) {
          color = '#D4AF37'; // Classic Pure Gold
        } else if (price >= 1500000) {
          color = '#E5C158'; // Warm Amber Gold
        } else {
          color = '#38BDF8'; // Azure Cyan for emerging luxury
        }
      }

      return {
        ...d,
        height,
        color,
        lat: Number(d.lat || d.latitude || 0),
        lng: Number(d.lng || d.longitude || 0),
        price,
        city: d.city || 'Exclusive Area',
        country: d.country || 'Global Market'
      };
    });
  },

  /**
   * Render and configure Globe.gl
   */
  renderGlobe() {
    const width = this.container.offsetWidth || window.innerWidth;
    const height = this.container.offsetHeight || window.innerHeight;

    this.globe = Globe()(this.container)
      .width(width)
      .height(height)
      .globeImageUrl('https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg')
      .bumpImageUrl('https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png')
      .backgroundImageUrl('https://cdn.jsdelivr.net/npm/three-globe/example/img/night-sky.png')
      .showAtmosphere(true)
      .atmosphereColor('#D4AF37')
      .atmosphereAltitude(0.18)
      // 3D Building Columns
      .pointsData(this.filteredData)
      .pointAltitude(d => d.height)
      .pointColor(d => d.color)
      .pointRadius(0.45)
      .pointsMerge(false) // Keep separate for hover/click interaction
      .pointResolution(16)
      // Tooltip Card with Luxury Glassmorphic Design
      .pointLabel(d => `
        <div style="
          background: rgba(10, 10, 15, 0.94);
          padding: 16px 20px;
          border-radius: 14px;
          border: 1px solid rgba(212, 175, 55, 0.45);
          box-shadow: 0 15px 35px -5px rgba(0,0,0,0.8), 0 0 25px rgba(212, 175, 55, 0.25);
          color: #F1F5F9;
          font-family: 'Inter', sans-serif;
          min-width: 230px;
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          pointer-events: none;
        ">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="color: #D4AF37; font-weight: 700; font-size: 15px; font-family: 'Playfair Display', serif; letter-spacing: 0.5px;">
              ${d.city}
            </span>
            <span style="font-size: 11px; background: rgba(212, 175, 55, 0.15); color: #F5D76E; padding: 2px 7px; border-radius: 6px; border: 1px solid rgba(212, 175, 55, 0.3);">
              PRIME
            </span>
          </div>
          <div style="color: #94A3B8; font-size: 12px; margin-bottom: 12px; display: flex; align-items: center; gap: 5px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            ${d.country}
          </div>
          <div style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 10px; display: flex; align-items: baseline; justify-content: space-between;">
            <span style="font-size: 12px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.8px;">Est. Value</span>
            <span style="font-size: 18px; font-weight: 700; color: #F5D76E; font-family: 'Inter', sans-serif;">
              $${Number(d.price).toLocaleString('en-US')}
            </span>
          </div>
          ${d.area ? `
          <div style="font-size: 11px; color: #64748B; margin-top: 6px; text-align: right;">
            Avg. Area: ${d.area} m² ${d.bedrooms ? `• ${d.bedrooms} Beds` : ''}
          </div>` : ''}
        </div>
      `)
      .onPointClick(point => this.zoomToPoint(point))
      .onPointHover(point => {
        this.currentHovered = point;
        this.container.style.cursor = point ? 'pointer' : 'default';
        if (point) {
          this.setRotation(false);
        } else if (this.isRotating) {
          this.setRotation(true);
        }
      });

    // Camera Controls Configuration
    const controls = this.globe.controls();
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.5;
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = 140;
      controls.maxDistance = 500;
    }

    // Fly-in Camera Intro Animation
    this.globe.pointOfView({ altitude: 3.6, lat: 20, lng: 0 }, 0);
    setTimeout(() => {
      if (this.globe) {
        this.globe.pointOfView({ altitude: 2.1, lat: 25, lng: 15 }, 2200);
      }
    }, 400);
  },

  /**
   * Zoom into a selected real estate coordinate point
   */
  zoomToPoint(point) {
    if (!point || !this.globe) return;

    this.setRotation(false);

    this.globe.pointOfView({
      lat: point.lat,
      lng: point.lng,
      altitude: 0.75
    }, 1600);

    if (window.App && typeof window.App.showToast === 'function') {
      window.App.showToast(
        `Focusing on ${point.city}, ${point.country} • Avg: $${Number(point.price).toLocaleString('en-US')}`,
        'info',
        3500
      );
    }
  },

  /**
   * Reset Camera to default global orbit
   */
  resetView() {
    if (!this.globe) return;
    this.globe.pointOfView({ lat: 20, lng: 15, altitude: 2.1 }, 1600);
    this.setRotation(true);
  },

  /**
   * Zoom to specific geographic center
   */
  zoomToCountry(lat, lng) {
    if (!this.globe) return;
    this.setRotation(false);
    this.globe.pointOfView({ lat, lng, altitude: 1.15 }, 1500);
  },

  /**
   * Toggle auto-rotation state and speed
   */
  setRotation(active, speed = 0.5) {
    if (!this.globe) return;
    const controls = this.globe.controls();
    if (controls) {
      controls.autoRotate = active;
      controls.autoRotateSpeed = speed;
    }
  },

  /**
   * Handle dynamic container & window resizing
   */
  handleResize() {
    if (this.globe && this.container) {
      const width = this.container.offsetWidth;
      const height = this.container.offsetHeight;
      if (width > 0 && height > 0) {
        this.globe.width(width);
        this.globe.height(height);
      }
    }
  },

  /**
   * Filter visible buildings by selected country name
   */
  filterByCountry(countryName) {
    if (!this.globe) return;

    if (!countryName || countryName === 'all' || countryName === 'Tất cả (Toàn cầu)') {
      this.filteredData = [...this.data];
      this.globe.pointsData(this.filteredData);
      this.resetView();
      return;
    }

    const filtered = this.data.filter(d => 
      d.country && d.country.toLowerCase() === countryName.toLowerCase()
    );

    if (filtered.length > 0) {
      this.filteredData = filtered;
      this.globe.pointsData(this.filteredData);

      const avgLat = filtered.reduce((sum, item) => sum + item.lat, 0) / filtered.length;
      const avgLng = filtered.reduce((sum, item) => sum + item.lng, 0) / filtered.length;
      this.zoomToCountry(avgLat, avgLng);

      if (window.App && typeof window.App.showToast === 'function') {
        window.App.showToast(`Displaying ${filtered.length} curated estates in ${countryName}`, 'info', 2500);
      }
    } else {
      if (window.App && typeof window.App.showToast === 'function') {
        window.App.showToast(`No specific coordinate models for ${countryName}`, 'warning', 2500);
      }
    }
  },

  /**
   * Find and zoom to a city
   */
  focusCity(cityName) {
    if (!this.globe || !cityName) return;
    const match = this.data.find(d => d.city && d.city.toLowerCase() === cityName.toLowerCase());
    if (match) {
      this.zoomToPoint(match);
    }
  },

  /**
   * Clean up globe resources
   */
  destroy() {
    if (this.globe && this.container) {
      this.container.innerHTML = '';
      this.globe = null;
    }
  }
};

// Expose GlobeViz globally
window.GlobeViz = GlobeViz;
