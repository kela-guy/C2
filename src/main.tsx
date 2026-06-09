import { createRoot } from 'react-dom/client';
import App from './app/App.tsx';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(<App />);

// Vercel Toolbar Comments — opt-in only. Reviewers append `?comments=1` once;
// the choice sticks in localStorage so the toolbar persists across navigations
// and reloads. End-users never trigger this, so they never see the login
// prompt. `?comments=0` clears it. Mounting is lazy so the toolbar's client
// bundle stays out of the critical path.
const params = new URLSearchParams(location.search);
if (params.get('comments') === '0') {
  localStorage.removeItem('c2hub.comments');
} else if (params.has('comments')) {
  localStorage.setItem('c2hub.comments', '1');
}
if (localStorage.getItem('c2hub.comments') === '1') {
  void import('@vercel/toolbar/vite').then(({ mountVercelToolbar }) => {
    mountVercelToolbar();
  });
}
