/**
 * ====================================================================
 * ESTATEVISION — MOCK DATA REPOSITORY
 * File: static/js/mockData.js
 * Centralized mock data layer for offline preview & frontend modules.
 * Easily swappable with Python backend REST APIs.
 * ====================================================================
 */

'use strict';

const MockData = {
  // 1. Fair-Value Hedonic Gauge Data
  fairValue: {
    calculate(property) {
      const price = property.price || 4500000;
      const deviation = (Math.sin(price) * 0.12); // -12% to +12%
      const estimatedValue = Math.round(price * (1 + deviation));
      const diffPercent = ((estimatedValue - price) / price) * 100;
      
      let rating = 'Fair Value';
      let statusColor = 'var(--ev-gold)';
      if (diffPercent > 4) {
        rating = 'Undervalued (Great Buy)';
        statusColor = 'var(--ev-success)';
      } else if (diffPercent < -4) {
        rating = 'Premium Over Market';
        statusColor = 'var(--ev-warning)';
      }

      return {
        listPrice: price,
        estimatedValue: estimatedValue,
        difference: estimatedValue - price,
        differencePercent: diffPercent.toFixed(1),
        confidenceScore: 94.6,
        hedonicSpreadMin: Math.round(estimatedValue * 0.93),
        hedonicSpreadMax: Math.round(estimatedValue * 1.07),
        rating: rating,
        statusColor: statusColor,
        modelFeatures: [
          { label: 'Square Meter Factor', impact: '+6.2%' },
          { label: 'High Elevation / Floor', impact: '+3.8%' },
          { label: 'Sovereign YoY Index', impact: '+4.1%' },
          { label: 'Neighborhood Prime Metric', impact: '+5.5%' }
        ]
      };
    }
  },

  // 2. True Cost Calculator (by Sovereign Jurisdiction)
  trueCost: {
    jurisdictions: {
      'United States': { transferTax: 0.02, legalNotary: 0.01, annualTax: 0.018, maintenance: 0.012 },
      'United Kingdom': { transferTax: 0.12, legalNotary: 0.015, annualTax: 0.008, maintenance: 0.015 },
      'United Arab Emirates': { transferTax: 0.04, legalNotary: 0.005, annualTax: 0.00, maintenance: 0.02 },
      'Monaco': { transferTax: 0.075, legalNotary: 0.015, annualTax: 0.00, maintenance: 0.025 },
      'Switzerland': { transferTax: 0.035, legalNotary: 0.012, annualTax: 0.006, maintenance: 0.015 },
      'France': { transferTax: 0.08, legalNotary: 0.02, annualTax: 0.012, maintenance: 0.018 },
      'Singapore': { transferTax: 0.20, legalNotary: 0.01, annualTax: 0.01, maintenance: 0.012 },
      'Japan': { transferTax: 0.045, legalNotary: 0.015, annualTax: 0.014, maintenance: 0.015 },
      'Default': { transferTax: 0.05, legalNotary: 0.012, annualTax: 0.01, maintenance: 0.015 }
    },

    compute(price, country = 'Default', downPaymentPct = 0.3) {
      const rates = this.jurisdictions[country] || this.jurisdictions['Default'];
      const transferTax = Math.round(price * rates.transferTax);
      const legalNotary = Math.round(price * rates.legalNotary);
      const escrowFees = 8500;
      const initialCosts = price + transferTax + legalNotary + escrowFees;
      const annualPropertyTax = Math.round(price * rates.annualTax);
      const annualMaintenance = Math.round(price * rates.maintenance);
      const annualTotalHolding = annualPropertyTax + annualMaintenance;

      const downPayment = Math.round(price * downPaymentPct);
      const loanAmount = price - downPayment;
      const monthlyMortgage = Math.round((loanAmount * 0.058) / 12); // 5.8% prime rate approx

      return {
        purchasePrice: price,
        transferTax,
        legalNotary,
        escrowFees,
        totalAcquisitionCost: initialCosts,
        downPayment,
        loanAmount,
        monthlyMortgage,
        annualPropertyTax,
        annualMaintenance,
        annualTotalHolding,
        fiveYearTotalCarry: initialCosts + (annualTotalHolding * 5)
      };
    }
  },

  // 3. Yield Simulator
  yieldSimulator: {
    simulate(price, expectedWeeklyRent = null) {
      const rent = expectedWeeklyRent || (price * 0.0011); // ~5.7% gross
      const annualGrossIncome = rent * 52;
      const grossYield = ((annualGrossIncome / price) * 100);
      const operatingCosts = annualGrossIncome * 0.18; // 18% management + reserve
      const netAnnualIncome = annualGrossIncome - operatingCosts;
      const netYield = ((netAnnualIncome / price) * 100);
      
      // 5-year capital appreciation (assumed historical 6.4% CAGR)
      const yr5Appreciation = Math.round(price * Math.pow(1.064, 5));
      const total5YearReturn = (netAnnualIncome * 5) + (yr5Appreciation - price);

      return {
        weeklyRental: Math.round(rent),
        monthlyRental: Math.round(rent * 4.333),
        annualGross: Math.round(annualGrossIncome),
        grossYield: grossYield.toFixed(2),
        netYield: netYield.toFixed(2),
        occupancyRate: '94%',
        year5Value: yr5Appreciation,
        fiveYearTotalReturn: total5YearReturn,
        projectedIRR: '11.8%'
      };
    }
  },

  // 4. Escrow Timeline Data
  escrowStages: [
    {
      id: 1,
      title: 'Earnest Deposit Secured',
      description: '10% locked in institutional multisig vault with JPMorgan Sovereign Custody.',
      status: 'completed',
      date: 'May 14, 2026'
    },
    {
      id: 2,
      title: 'Cadastral & Title Clearance',
      description: 'Zero liens verified against national registry. Sovereign deed authenticated.',
      status: 'completed',
      date: 'May 17, 2026'
    },
    {
      id: 3,
      title: 'Architectural Due Diligence',
      description: 'Engineering survey & environmental climate resilience audit passed.',
      status: 'current',
      date: 'In Progress (ETA 48h)'
    },
    {
      id: 4,
      title: 'Sovereign Wire Release',
      description: 'Final 90% balance wire cleared through automated escrow contract EV-TX-88294.',
      status: 'upcoming',
      date: 'Scheduled May 24'
    },
    {
      id: 5,
      title: 'Deed Transfer & Sovereign Handover',
      description: 'Physical biometric keys delivered by diplomatic private courier.',
      status: 'upcoming',
      date: 'Scheduled May 26'
    }
  ],

  // 5. Climate Risk Score
  climateRisk: {
    evaluate(country = 'United States', city = 'Miami') {
      const risks = {
        'Miami': { flood: 'Moderate', wildfire: 'Low', heat: 'Elevated', overall: 68, label: 'Resilient Tier II' },
        'Dubai': { flood: 'Low', wildfire: 'None', heat: 'High', overall: 76, label: 'Climate Engineered' },
        'London': { flood: 'Low', wildfire: 'None', heat: 'Low', overall: 89, label: 'Maximum Stability' },
        'Tokyo': { flood: 'Moderate', seismic: 'Engineered High', heat: 'Moderate', overall: 84, label: 'High Seismic Tech' },
        'Monaco': { flood: 'Minimal', wildfire: 'Low', heat: 'Moderate', overall: 91, label: 'Pristine Coastal' }
      };
      return risks[city] || { flood: 'Low', wildfire: 'Low', heat: 'Moderate', overall: 85, label: 'Low Macro Risk' };
    }
  },

  // 6. Concierge AI Command Bar (Cmd+K / Ctrl+K)
  conciergeCommands: [
    { id: 'buy-penthouse', title: 'Find Penthouses under $10M in London & New York', category: 'Navigation', url: '/buy?search=penthouse' },
    { id: 'globe-view', title: 'Open 3D Interactive Global Map', category: 'Analytics', url: '/explore' },
    { id: 'bis-trends', title: 'View 100-Year BIS Sovereign Housing Index (1927–2026)', category: 'Macro Trends', url: '/global' },
    { id: 'compare-markets', title: 'Compare Yields: Dubai vs Singapore vs Miami', category: 'Intelligence', url: '/compare' },
    { id: 'ai-appraisal', title: 'Hedonic Machine Learning Price Predictor', category: 'Valuation', url: '/predict' },
    { id: 'list-property', title: 'List an Exclusive Residence with High-Res Media', category: 'Sell', url: '/sell' },
    { id: 'demo-broker', title: 'Switch to Prime Broker Perspective (Alexander Vance)', category: 'Account', url: '/demo-login/agent' },
    { id: 'demo-investor', title: 'Switch to Institutional Investor Perspective (Elena Rostova)', category: 'Account', url: '/demo-login/investor' }
  ],

  // 7. Data Provenance Sovereign Records
  provenance: {
    institution: 'Bank for International Settlements (BIS)',
    series: 'Selected Property Price Indices (Nominal & Real Q1 1927 - Q1 2026)',
    coverage: '61 Sovereign Nations / 144,169 Verified Property Micro-Records',
    lastSyncTimestamp: '2026-11-21T18:00:00Z',
    cryptographicHash: '0x8f2d9c104e76a382104bdca89741e129bf63d08e92'
  }
};

window.MockData = MockData;
