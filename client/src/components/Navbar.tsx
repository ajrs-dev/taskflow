import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <Link to={user ? '/boards' : '/login'} className="navbar__brand">
        <span className="navbar__logo" aria-hidden>
          ▦
        </span>
        TaskFlow
      </Link>

      <nav className="navbar__nav">
        {user ? (
          <>
            <span className="navbar__user">Hi, {user.name.split(' ')[0]}</span>
            <button className="btn btn--ghost" onClick={handleLogout}>
              Log out
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn--ghost">
              Log in
            </Link>
            <Link to="/register" className="btn btn--primary">
              Sign up
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
