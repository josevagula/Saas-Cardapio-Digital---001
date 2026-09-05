// Base URL prepended to every /api/* call. Empty string means "same origin"
// (local dev, where Vite's server and Express share one origin). Once the
// Express backend is deployed separately from the static GitHub Pages
// frontend (e.g. on Railway), this points there via VITE_API_BASE_URL set at
// build time.
export const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
