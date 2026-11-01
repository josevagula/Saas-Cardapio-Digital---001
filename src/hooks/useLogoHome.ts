import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

// What clicking the Zushy logo inside the panel does:
// - demonstration panel → back to the site's landing page (same as the
//   sidebar's "Voltar" button)
// - a real signed-in account → the Dashboard (never logs them out)
export function useLogoHome() {
  const { isDemoMode, setCurrentView, setLoggedIn } = useApp();
  const { logout } = useAuth();

  return async () => {
    if (isDemoMode) {
      await logout();
      setLoggedIn(false);
      setCurrentView('home');
    } else {
      setCurrentView('dashboard');
    }
  };
}
