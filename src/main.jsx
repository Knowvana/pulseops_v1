// ============================================================================
// Main Entry Point — PulseOps V1
//
// PURPOSE: React application bootstrap. Mounts the root <App /> component
// into the DOM. Imports global CSS (Tailwind directives + custom styles).
//
// HOW TO USE: This file is referenced by index.html's <script> tag and
// is auto-detected by Vite as the entry point.
//
// ARCHITECTURE: Minimal bootstrap — all application logic lives in App.jsx.
// ============================================================================
// Bring in React, which helps us write HTML-like code in JavaScript
import React from 'react';
// Bring in ReactDOM, which lets us put our app on the web page
import ReactDOM from 'react-dom/client';
// Bring in the main App component, which is like the starting page of our app
import App from '@core/App';
// Bring in the styles that make our app look good
import './index.css';

// Find the spot on the page where our app will appear and start showing it
ReactDOM.createRoot(document.getElementById('root')).render(
  // Use StrictMode to help catch mistakes while building the app
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
