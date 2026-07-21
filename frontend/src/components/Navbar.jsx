import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, LogOut } from 'lucide-react';
import { Button } from './Button';

export const Navbar = ({
  onLoginClick,
  onSignupClick,
  isAuthenticated = false,
  user = null,
  onLogout,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const profileLabel = useMemo(() => {
    if (!user) return 'User';
    return user.displayName || user.email || 'User';
  }, [user]);

  const avatarInitial = useMemo(() => {
    const source = (user?.displayName || user?.email || 'U').trim();
    return source.charAt(0).toUpperCase();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <nav className="navbar-glass">
      <div className="navbar-content">
        <div className="navbar-brand">
          <div className="navbar-brand-icon">B</div>
          <span>BeyondFear</span>
        </div>
        <div className="navbar-actions">
          {!isAuthenticated ? (
            <>
              <Button variant="ghost" size="sm" onClick={onLoginClick}>Login</Button>
              <Button variant="secondary" size="sm" onClick={onSignupClick}>Get Started</Button>
            </>
          ) : (
            <div className="profile-menu" ref={menuRef}>
              <button
                type="button"
                className="profile-menu-trigger"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                {user?.avatar ? (
                  <img src={user.avatar} alt={profileLabel} className="profile-avatar-image" />
                ) : (
                  <span className="profile-avatar-fallback">{avatarInitial}</span>
                )}
                <ChevronDown size={14} />
              </button>

              {menuOpen && (
                <div className="profile-dropdown" role="menu">
                  <div className="profile-dropdown-header">
                    <p>{profileLabel}</p>
                  </div>
                  <button
                    type="button"
                    className="profile-dropdown-item"
                    onClick={() => {
                      setMenuOpen(false);
                      onLogout?.();
                    }}
                  >
                    <LogOut size={14} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
