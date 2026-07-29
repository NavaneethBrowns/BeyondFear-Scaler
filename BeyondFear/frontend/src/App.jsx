import { useEffect, useState } from 'react';
import { Homepage } from './pages/Homepage';
import { SignupPage } from './pages/SignupPage';
import { LoginPage } from './pages/LoginPage';
import { ChatPage } from './pages/ChatPage';
import { authAPI } from './services/api';
import { ThreeBackdrop } from './components/ThreeBackdrop';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const restoreAuth = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (!token) {
        setAuthLoading(false);
        return;
      }

      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setIsAuthenticated(true);
          setCurrentPage('chat');
        } catch (error) {
          localStorage.removeItem('user');
        }
      }

      try {
        const profileResult = await authAPI.getProfile();
        setUser(profileResult.user);
        setIsAuthenticated(true);
        setCurrentPage('chat');
        localStorage.setItem('user', JSON.stringify(profileResult.user));
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setIsAuthenticated(false);
        setCurrentPage('home');
      } finally {
        setAuthLoading(false);
      }
    };

    restoreAuth();
  }, []);

  useEffect(() => {
    if (currentPage === 'chat' && !isAuthenticated) {
      setCurrentPage('home');
    }
  }, [currentPage, isAuthenticated]);

  const handleNavigate = (page) => {
    setCurrentPage(page);
  };

  const handleAuthSuccess = (authenticatedUser) => {
    setIsAuthenticated(true);
    if (authenticatedUser) {
      setUser(authenticatedUser);
      localStorage.setItem('user', JSON.stringify(authenticatedUser));
    }
    setCurrentPage('chat');
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
    setCurrentPage('home');
  };

  if (authLoading) {
    return (
      <div className="app-shell">
        <ThreeBackdrop scene="home" />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <ThreeBackdrop scene={currentPage} />
      <div className="app-content min-h-screen bg-white">
        {currentPage === 'home' && (
          <Homepage
            onNavigate={handleNavigate}
            isAuthenticated={isAuthenticated}
            user={user}
            onLogout={handleLogout}
          />
        )}
        {currentPage === 'signup' && (
          <SignupPage
            onNavigate={handleNavigate}
            onAuthSuccess={handleAuthSuccess}
            isAuthenticated={isAuthenticated}
            user={user}
            onLogout={handleLogout}
          />
        )}
        {currentPage === 'login' && (
          <LoginPage
            onNavigate={handleNavigate}
            onAuthSuccess={handleAuthSuccess}
            isAuthenticated={isAuthenticated}
            user={user}
            onLogout={handleLogout}
          />
        )}
        {currentPage === 'chat' && isAuthenticated && (
          <ChatPage
            onNavigate={handleNavigate}
            onLogout={handleLogout}
            isAuthenticated={isAuthenticated}
            user={user}
          />
        )}
      </div>
    </div>
  );
}

export default App;
