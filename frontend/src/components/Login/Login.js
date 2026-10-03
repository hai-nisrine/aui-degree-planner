import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css';
import { API_BASE, storeAuth } from '../../api';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');

  const validateEmail = (emailValue) => {
    if (!emailValue.trim().toLowerCase().endsWith('@aui.ma')) {
      setEmailError('Unverified email. Please use your AUI email address.');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleEmailChange = (e) => {
    const emailValue = e.target.value;
    setEmail(emailValue);
    if (emailValue) {
      validateEmail(emailValue);
    } else {
      setEmailError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateEmail(email)) {
      return;
    }

    const trimmedEmail = email.trim();

    if (!password) {
      alert('Please enter your password.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: trimmedEmail, password })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        alert(data.message || 'Login failed. Please check your credentials.');
        return;
      }

      storeAuth(data.user, rememberMe);

      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      alert('Unable to login right now. Please try again.');
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-container">
        <div className="login-left">
          <div className="login-branding">
            <div className="login-brand-text">
              <span className="brand-name">AUI Degree Planner</span>
            </div>
          </div>
          
          <div className="illustration">
            <div className="security-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="5" y="11" width="14" height="10" rx="2" strokeWidth="2"/>
                <path d="M12 11V7a3 3 0 0 1 6 0v4M9 7a3 3 0 0 0-3 3v1" strokeWidth="2"/>
              </svg>
            </div>
            <div className="phone-mockup">
              <div className="phone-screen">
                <div className="user-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="8" r="4"/>
                    <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
                  </svg>
                </div>
              </div>
            </div>
            <div className="blob blob-1"></div>
            <div className="blob blob-2"></div>
          </div>
        </div>

        <div className="login-right">
          <div className="login-form-container">
            <h1 className="login-title">
              Welcome to Your Personalized<br />
              <span className="highlight">Degree Planner</span>
            </h1>

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="email">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="a.example@aui.ma"
                  required
                  className={emailError ? 'error' : ''}
                />
                {emailError && <span className="error-message">{emailError}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="password">
                  Password
                </label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    required
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember me</span>
                </label>
              </div>

              <button type="submit" className="login-button">
                Login
              </button>

              <p className="register-link">
                Don't have an account? <Link to="/register">Register</Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
