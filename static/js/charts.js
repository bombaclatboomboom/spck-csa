/**
 * ====================================================================
 * AURA LUXURY REAL ESTATE — APEXCHARTS VISUALIZATION ENGINE
 * File: static/js/charts.js
 * ====================================================================
 */

'use strict';

const Charts = {
  instances: {},

  /**
   * Global Luxury Theme Configuration for ApexCharts
   */
  getThemeConfig() {
    return {
      chart: {
        fontFamily: "'Inter', sans-serif",
        foreColor: '#94A3B8',
        background: 'transparent',
        toolbar: {
          show: false,
          tools: {
            download: false,
            selection: false,
            zoom: false,
            zoomin: false,
            zoomout: false,
            pan: false,
            reset: false
          }
        },
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 1000,
          animateGradually: {
            enabled: true,
            delay: 120
          },
          dynamicAnimation: {
            enabled: true,
            speed: 450
          }
        },
        dropShadow: {
          enabled: false
        }
      },
      theme: {
        mode: 'dark'
      },
      colors: [
        '#D4AF37', // Gold
        '#38BDF8', // Azure Sky
        '#10B981', // Emerald
        '#F59E0B', // Amber
        '#8B5CF6', // Purple
        '#EC4899', // Rose
        '#06B6D4'  // Cyan
      ],
      grid: {
        borderColor: 'rgba(255, 255, 255, 0.06)',
        strokeDashArray: 4,
        xaxis: {
          lines: { show: false }
        },
        yaxis: {
          lines: { show: true }
        },
        padding: {
          top: 10,
          right: 20,
          bottom: 10,
          left: 10
        }
      },
      tooltip: {
        theme: 'dark',
        style: {
          fontSize: '13px',
          fontFamily: "'Inter', sans-serif"
        },
        y: {
          formatter: (val) => {
            if (val === undefined || val === null) return '$0';
            return `$${Number(val).toLocaleString('en-US')}`;
          }
        },
        marker: {
          show: true
        }
      },
      legend: {
        position: 'top',
        horizontalAlign: 'right',
        fontSize: '13px',
        labels: {
          colors: '#CBD5E1'
        },
        markers: {
          radius: 12
        }
      }
    };
  },

  /**
   * Helper to safely mount and record chart instances
   */
  async render(containerId, options) {
    const el = document.getElementById(containerId);
    if (!el) {
      console.warn(`[Charts.render] Container #${containerId} not found.`);
      return null;
    }

    if (typeof ApexCharts === 'undefined') {
      console.error('[Charts.render] ApexCharts is not defined. Ensure CDN is loaded.');
      return null;
    }

    // Destroy existing instance in the same container if present
    this.destroy(containerId);

    // Merge baseline theme with options
    const baseTheme = this.getThemeConfig();
    const mergedOptions = {
      ...baseTheme,
      ...options,
      chart: {
        ...baseTheme.chart,
        ...(options.chart || {})
      },
      grid: {
        ...baseTheme.grid,
        ...(options.grid || {})
      },
      tooltip: {
        ...baseTheme.tooltip,
        ...(options.tooltip || {})
      }
    };

    const chart = new ApexCharts(el, mergedOptions);
    await chart.render();
    this.instances[containerId] = chart;
    return chart;
  },

  /**
   * Destroy a single chart instance
   */
  destroy(containerId) {
    if (this.instances[containerId]) {
      try {
        this.instances[containerId].destroy();
      } catch (err) {
        console.warn(`[Charts.destroy] Error destroying chart #${containerId}:`, err);
      }
      delete this.instances[containerId];
    }
  },

  /**
   * Destroy all active chart instances
   */
  destroyAll() {
    Object.keys(this.instances).forEach(id => this.destroy(id));
  },

  /**
   * 1. PRICE TREND AREA CHART
   * Smooth area chart showing valuation history or projected appreciation
   */
  async createPriceTrendChart(containerId, data = null) {
    // Default fallback dataset
    const fallback = {
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      series: [
        {
          name: 'Prime Portfolio Avg',
          data: [2150000, 2220000, 2190000, 2280000, 2350000, 2410000, 2490000, 2520000, 2610000, 2680000, 2750000, 2890000]
        },
        {
          name: 'Global Market Index',
          data: [1800000, 1820000, 1850000, 1870000, 1910000, 1940000, 1990000, 2010000, 2060000, 2100000, 2150000, 2210000]
        }
      ]
    };

    let categories = fallback.categories;
    let series = fallback.series;

    if (data) {
      if (data.categories && data.series) {
        categories = data.categories;
        series = data.series;
      } else if (Array.isArray(data)) {
        categories = data.map(d => d.date || d.month || d.year || d.label);
        series = [{
          name: 'Price Trend',
          data: data.map(d => Number(d.price || d.value || 0))
        }];
      }
    }

    const options = {
      chart: {
        type: 'area',
        height: 350
      },
      colors: ['#D4AF37', '#38BDF8'],
      stroke: {
        curve: 'smooth',
        width: [3, 2]
      },
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'dark',
          type: 'vertical',
          shadeIntensity: 0.5,
          gradientToColors: ['#F5D76E', '#0284C7'],
          inverseColors: false,
          opacityFrom: 0.45,
          opacityTo: 0.05,
          stops: [0, 95, 100]
        }
      },
      markers: {
        size: 0,
        hover: {
          size: 6,
          sizeOffset: 3
        }
      },
      xaxis: {
        categories: categories,
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: {
          style: { colors: '#94A3B8', fontSize: '12px' }
        }
      },
      yaxis: {
        labels: {
          style: { colors: '#94A3B8', fontSize: '12px' },
          formatter: (val) => {
            if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
            if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}k`;
            return `$${val}`;
          }
        }
      },
      series: series
    };

    return await this.render(containerId, options);
  },

  /**
   * 2. TOP CITIES HORIZONTAL BAR CHART
   * Displays highest-value real estate metropolitan regions
   */
  async createTopCitiesChart(containerId, data = null) {
    let categories = ['Monaco', 'Hong Kong', 'New York', 'Singapore', 'London', 'Zurich', 'Dubai', 'Paris', 'Tokyo', 'Sydney'];
    let values = [14200000, 9800000, 8900000, 6800000, 7450000, 6900000, 6200000, 5800000, 5100000, 5400000];

    if (data) {
      if (Array.isArray(data)) {
        categories = data.slice(0, 10).map(d => d.city || d.name || 'Unknown');
        values = data.slice(0, 10).map(d => Number(d.price || d.avg_price || 0));
      } else if (data.cities && data.prices) {
        categories = data.cities;
        values = data.prices;
      }
    }

    const options = {
      chart: {
        type: 'bar',
        height: 380
      },
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 6,
          barHeight: '60%',
          distributed: true,
          dataLabels: {
            position: 'bottom'
          }
        }
      },
      colors: [
        '#F5D76E', '#D4AF37', '#E5C158', '#C5A028', '#B8860B',
        '#38BDF8', '#0284C7', '#10B981', '#F59E0B', '#8B5CF6'
      ],
      dataLabels: {
        enabled: true,
        textAnchor: 'start',
        style: {
          colors: ['#F8FAFC'],
          fontSize: '12px',
          fontFamily: "'Inter', sans-serif",
          fontWeight: 600
        },
        formatter: (val, opt) => {
          return `${opt.w.globals.labels[opt.dataPointIndex]}: $${(val / 1e6).toFixed(1)}M`;
        },
        offsetX: 10,
        dropShadow: {
          enabled: true,
          top: 1,
          left: 1,
          blur: 2,
          color: '#000',
          opacity: 0.8
        }
      },
      xaxis: {
        categories: categories,
        labels: {
          show: false
        },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        labels: {
          show: false
        }
      },
      legend: {
        show: false
      },
      series: [{
        name: 'Average Property Value',
        data: values
      }]
    };

    return await this.render(containerId, options);
  },

  /**
   * 3. PROPERTY DISTRIBUTION DONUT CHART
   * Categorizes estate distribution by type or region
   */
  async createDistributionChart(containerId, data = null) {
    let labels = ['Penthouses & Mansions', 'Waterfront Villas', 'Luxury Condominiums', 'Historical Châteaux', 'High-Yield Townhomes'];
    let series = [38, 26, 20, 10, 6];

    if (data) {
      if (data.labels && data.series) {
        labels = data.labels;
        series = data.series.map(Number);
      } else if (Array.isArray(data)) {
        labels = data.map(d => d.category || d.name || d.country || d.city);
        series = data.map(d => Number(d.count || d.value || d.price || 0));
      }
    }

    const options = {
      chart: {
        type: 'donut',
        height: 320
      },
      labels: labels,
      series: series,
      colors: ['#D4AF37', '#F5D76E', '#38BDF8', '#10B981', '#8B5CF6', '#EC4899'],
      stroke: {
        show: true,
        colors: ['#0A0A0F'],
        width: 3
      },
      plotOptions: {
        pie: {
          donut: {
            size: '72%',
            labels: {
              show: true,
              name: {
                show: true,
                fontSize: '13px',
                color: '#94A3B8'
              },
              value: {
                show: true,
                fontSize: '22px',
                fontWeight: 700,
                color: '#F1F5F9',
                formatter: (val) => Number(val).toLocaleString()
              },
              total: {
                show: true,
                label: 'Total Estates',
                fontSize: '12px',
                color: '#D4AF37',
                formatter: (w) => {
                  const total = w.globals.seriesTotals.reduce((a, b) => a + b, 0);
                  return total.toLocaleString();
                }
              }
            }
          }
        }
      },
      legend: {
        position: 'bottom',
        horizontalAlign: 'center',
        itemMargin: { horizontal: 8, vertical: 4 }
      }
    };

    return await this.render(containerId, options);
  },

  /**
   * 4. PRICE HISTOGRAM CHART
   * Visualizes frequency distribution across price tiers
   */
  async createHistogramChart(containerId, data = null) {
    let bins = ['<$1M', '$1M-$2M', '$2M-$3.5M', '$3.5M-$5M', '$5M-$8M', '$8M-$12M', '$12M-$20M', '>$20M'];
    let counts = [180, 420, 680, 540, 390, 210, 110, 65];

    if (data) {
      if (data.bins && data.counts) {
        bins = data.bins;
        counts = data.counts.map(Number);
      } else if (Array.isArray(data)) {
        bins = data.map(d => d.bin || d.range);
        counts = data.map(d => Number(d.count || d.value || 0));
      }
    }

    const options = {
      chart: {
        type: 'bar',
        height: 330
      },
      plotOptions: {
        bar: {
          borderRadius: 6,
          columnWidth: '58%',
          distributed: false
        }
      },
      colors: ['#D4AF37'],
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'dark',
          type: 'vertical',
          shadeIntensity: 0.5,
          gradientToColors: ['#F5D76E'],
          inverseColors: false,
          opacityFrom: 0.9,
          opacityTo: 0.65,
          stops: [0, 100]
        }
      },
      dataLabels: {
        enabled: false
      },
      xaxis: {
        categories: bins,
        labels: {
          style: { colors: '#94A3B8', fontSize: '11px' },
          rotate: -25
        },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        title: {
          text: 'Number of Properties',
          style: { color: '#64748B', fontSize: '12px' }
        },
        labels: {
          style: { colors: '#94A3B8' }
        }
      },
      tooltip: {
        y: {
          formatter: (val) => `${val.toLocaleString()} properties`
        }
      },
      series: [{
        name: 'Listings in Bracket',
        data: counts
      }]
    };

    return await this.render(containerId, options);
  },

  /**
   * 5. COUNTRY COMPARISON RADAR CHART
   * Multi-axial comparison across real estate investment factors
   */
  async createRadarChart(containerId, data = null) {
    const defaultCategories = ['Appreciation Rate', 'Rental Yield', 'Liquidity Index', 'Luxury Density', 'Market Stability', 'Investor Inflow'];
    
    let categories = defaultCategories;
    let series = [
      {
        name: 'United States',
        data: [85, 70, 92, 88, 80, 95]
      },
      {
        name: 'United Arab Emirates',
        data: [94, 88, 85, 96, 75, 98]
      },
      {
        name: 'Switzerland',
        data: [72, 60, 78, 95, 98, 82]
      }
    ];

    if (data && data.categories && data.series) {
      categories = data.categories;
      series = data.series;
    }

    const options = {
      chart: {
        type: 'radar',
        height: 360
      },
      colors: ['#D4AF37', '#38BDF8', '#10B981'],
      stroke: {
        width: 2.2
      },
      fill: {
        opacity: 0.22
      },
      markers: {
        size: 4,
        hover: { size: 7 }
      },
      xaxis: {
        categories: categories,
        labels: {
          style: {
            colors: ['#E2E8F0', '#E2E8F0', '#E2E8F0', '#E2E8F0', '#E2E8F0', '#E2E8F0'],
            fontSize: '12px',
            fontFamily: "'Inter', sans-serif"
          }
        }
      },
      yaxis: {
        show: false
      },
      series: series
    };

    return await this.render(containerId, options);
  },

  /**
   * 6. PRICE HEATMAP / TREEMAP CHART
   * Visualizes hierarchical capital distribution
   */
  async createTreemapChart(containerId, data = null) {
    let seriesData = [
      { x: 'New York (Manhattan)', y: 380 },
      { x: 'London (Mayfair)', y: 310 },
      { x: 'Monaco (Carré d\'Or)', y: 440 },
      { x: 'Dubai (Palm Jumeirah)', y: 290 },
      { x: 'Paris (8th Arr.)', y: 220 },
      { x: 'Tokyo (Minato)', y: 195 },
      { x: 'Miami (Star Island)', y: 250 },
      { x: 'Singapore (District 9)', y: 270 },
      { x: 'Los Angeles (Bel Air)', y: 260 },
      { x: 'Zurich (Goldcoast)', y: 210 }
    ];

    if (data && Array.isArray(data)) {
      seriesData = data.map(d => ({
        x: d.label || d.city || d.name,
        y: Number(d.value || d.price || d.market_cap || 0)
      }));
    }

    const options = {
      chart: {
        type: 'treemap',
        height: 350
      },
      colors: ['#D4AF37'],
      plotOptions: {
        treemap: {
          distributed: true,
          enableShades: true,
          shadeIntensity: 0.5
        }
      },
      series: [{
        data: seriesData
      }],
      tooltip: {
        y: {
          formatter: (val) => `$${val}M Capital Volume`
        }
      }
    };

    return await this.render(containerId, options);
  },

  /**
   * 7. PRICE VOLATILITY RANGE / BOXPLOT CHART
   * Highlights Min, Median, and Max valuation spreads
   */
  async createVolatilityChart(containerId, data = null) {
    let series = [{
      data: [
        { x: 'New York', y: [4200000, 6800000, 8900000, 11500000, 16000000] },
        { x: 'London', y: [3800000, 5400000, 7450000, 9200000, 14000000] },
        { x: 'Dubai', y: [2900000, 4500000, 6200000, 8100000, 12500000] },
        { x: 'Monaco', y: [8500000, 11200000, 14200000, 18000000, 26000000] },
        { x: 'Tokyo', y: [2600000, 3900000, 5100000, 6800000, 9500000] }
      ]
    }];

    if (data && data.series) {
      series = data.series;
    }

    const options = {
      chart: {
        type: 'boxPlot',
        height: 350
      },
      colors: ['#D4AF37', '#38BDF8'],
      stroke: {
        colors: ['#D4AF37']
      },
      plotOptions: {
        boxPlot: {
          colors: {
            upper: '#D4AF37',
            lower: '#10B981'
          }
        }
      },
      yaxis: {
        labels: {
          formatter: (val) => `$${(val / 1e6).toFixed(1)}M`
        }
      },
      series: series
    };

    return await this.render(containerId, options);
  },

  /**
   * 8. MINI SPARKLINE FOR STAT CARDS
   * Ultra-compact line or area for KPI cards
   */
  async createSparkline(containerId, data = null, color = '#D4AF37') {
    let seriesData = [45, 52, 49, 62, 58, 71, 78, 85, 92];

    if (data && Array.isArray(data)) {
      seriesData = data.map(Number);
    }

    const options = {
      chart: {
        type: 'area',
        height: 55,
        sparkline: {
          enabled: true
        }
      },
      stroke: {
        curve: 'smooth',
        width: 2.2
      },
      colors: [color],
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'dark',
          type: 'vertical',
          shadeIntensity: 0.5,
          gradientToColors: [color],
          opacityFrom: 0.5,
          opacityTo: 0.05
        }
      },
      tooltip: {
        fixed: { enabled: false },
        x: { show: false },
        y: {
          title: {
            formatter: () => ''
          }
        },
        marker: { show: false }
      },
      series: [{
        name: 'Trend',
        data: seriesData
      }]
    };

    return await this.render(containerId, options);
  }
};

// Expose globally
window.Charts = Charts;
