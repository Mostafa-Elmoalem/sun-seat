import React from 'react';
import ReactDOM from 'react-dom/client';
import './ui/styles/index.css';
import { App } from './ui/App.tsx';
import { calculateSunPosition } from './core/astronomy/noaa-solar.ts';
import { cairoTimeToUtc, formatCairoTime } from './core/astronomy/timezone.ts';
import { evaluateHonestRules } from './core/exposure/honest-rules.ts';
import { calculateTripExposure } from './core/exposure/exposure-calculator.ts';
import { defaultVehicleRepository } from './core/vehicles/vehicle-repository.ts';
import { defaultPlacesRepository } from './adapters/places-repository.ts';
import { defaultRoutesRepository } from './adapters/routes-repository.ts';

// Keep references active for bundle size auditing across core + adapters + UI
export const engineCore = {
  calculateSunPosition,
  cairoTimeToUtc,
  formatCairoTime,
  evaluateHonestRules,
  calculateTripExposure,
  defaultVehicleRepository,
  defaultPlacesRepository,
  defaultRoutesRepository
};

const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
