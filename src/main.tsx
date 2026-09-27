import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './ui/styles/index.css';
import { App } from './ui/App.tsx';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
