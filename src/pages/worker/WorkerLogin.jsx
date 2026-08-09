import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/auth';
import '../admin/Login.css';
import workerBackground from '../../images/worker-maintenance-background.jpg';

const WorkerLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Don't submit if already loading
    if (loading) {
      return;
    }

    setLoading(true);
    setShowErrorModal(false);
    setErrorMessage('');

    try {
      await login(email, password, ['WORKER']);

      // Redirect to intended page or default to dashboard
      const intendedPage = location.state?.from || '/worker/dashboard';
      navigate(intendedPage, { replace: true });
    } catch (err) {
      setErrorMessage(err.message || 'Login failed. Please try again.');
      setShowErrorModal(true);
      // Show error modal - NO AUTOMATIC REDIRECT, user must click button to close
    } finally {
      setLoading(false);
    }
  };

  const handleCloseErrorModal = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setShowErrorModal(false);
    // User stays on login page - NO NAVIGATION
  };


  return (
    <div className="login-container worker-login" style={{ backgroundImage: `url(${workerBackground})` }}>
      <div className="login-card">
        <div className="login-header">
          <h1>Worker Login</h1>
          <p>Access your assigned tickets</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="worker@example.com"
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="login-footer">
          <p><a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }}>← Back to Home</a></p>
        </div>
      </div>

      {/* Error Modal - NO automatic redirect */}
      {showErrorModal && (
        <div className="error-modal-overlay" onClick={handleCloseErrorModal}>
          <div className="error-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="error-modal-header">
              <h3>Login Failed</h3>
            </div>
            <div className="error-modal-body">
              <p>{errorMessage}</p>
            </div>
            <div className="error-modal-footer">
              <button className="error-modal-btn" onClick={handleCloseErrorModal}>
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerLogin;
