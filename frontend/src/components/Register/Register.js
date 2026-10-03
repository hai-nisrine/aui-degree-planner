import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Register.css';
import { API_BASE } from '../../api';

function Register() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    major: '',
    specialization: '',
    minor: '',
    thematicArea: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const navigate = useNavigate();

  const majors = [
    { value: 'general-engineering', label: 'General Engineering' },
    { value: 'ems', label: 'Engineering and Management Sciences' },
    { value: 'computer-science', label: 'Computer Science' },
    { value: 'renewable-energies', label: 'Renewable Energies' }
  ];

  const specializations = [
    { value: 'advanced-cs', label: 'Advanced Computer Science (ACS) Specialization' },
    { value: 'ai', label: 'Artificial Intelligence (AI) Specialization' },
    { value: 'big-data', label: 'Big Data Analytics (BDA) Specialization' },
    { value: 'cybersecurity', label: 'Cybersecurity (CSEC) Specialization' },
    { value: 'computer-systems', label: 'Computer Systems (CSys) Specialization' },
    { value: 'software-engineering', label: 'Software Engineering (SE) Specialization' }
  ];

  const generalEngineeringAreas = [
    { value: 'mechatronics', label: 'Mechatronics' },
    { value: 'biotech', label: 'BioTech' },
    { value: 'aeronautics', label: 'Aeronautics' }
  ];

  const emsAreas = [
    { value: 'manufacturing', label: 'Manufacturing and Logistics Engineering' },
    { value: 'decision-support', label: 'Decision Support Systems' },
    { value: 'biotech', label: 'BioTech' },
    { value: 'finance', label: 'Finance' }
  ];

  const minors = [
    { value: 'business-admin', label: 'Business Administration' },
    { value: 'english', label: 'English' },
    { value: 'international-studies', label: 'International Studies' },
    { value: 'gender-studies', label: 'Gender Studies' },
    { value: 'african-studies', label: 'African Studies' },
    { value: 'human-resource', label: 'Human Resource Development' },
    { value: 'human-rights', label: 'Human Rights and Development' },
    { value: 'organizational-studies', label: 'Organizational Studies' },
    { value: 'communication', label: 'Communication' },
    { value: 'psychology', label: 'Psychology' },
    { value: 'general-engineering', label: 'General Engineering' },
    { value: 'mathematics', label: 'Mathematics' },
    { value: 'logistics-and-supply-chain', label: 'Logistics and Supply Chain' }
  ];
 const validateEmail = (emailValue) => {
    if (!/^[a-z]\.[a-z]+@aui\.ma$/i.test(emailValue.trim())) {
      setEmailError('Please use your AUI email address (e.g. a.example@aui.ma).');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'email') {
      if (value) {
        validateEmail(value);
      } else {
        setEmailError('');
      }
    }

    setFormData({
      ...formData,
      [name]: value
    });

    // Reset conditional fields when major changes
    if (name === 'major') {
      setFormData(prev => ({
        ...prev,
        major: value,
        specialization: '',
        minor: '',
        thematicArea: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateEmail(formData.email)) {
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords don't match!");
      return;
    }

    if (!formData.major) {
      alert("Please select your major");
      return;
    }

    try {
      const payload = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        major: formData.major || null,
        minor: formData.minor || null,
        specialization: formData.specialization || null,
        thematicArea: formData.thematicArea || null
      };

      const response = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        alert(data.message || 'Registration failed. Please try again.');
        return;
      }

      alert('Registration successful! Please login.');
      navigate('/login');
    } catch (err) {
      console.error('Registration error:', err);
      alert('Unable to register right now. Please try again.');
    }
  };

  return (
    <div className="register-wrapper">
      <div className="register-container">
        <div className="register-left">
          <div className="register-branding">
            <div className="register-brand-text">
              <span className="brand-name">AUI Degree Planner</span>
            </div>
          </div>
          
          <div className="illustration">
            <div className="graduation-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 14l9-5-9-5-9 5 9 5z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="phone-mockup">
              <div className="phone-screen">
                <div className="check-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
            <div className="blob blob-1"></div>
            <div className="blob blob-2"></div>
          </div>
        </div>

        <div className="register-right">
          <div className="register-form-container">
            <h1 className="register-title">
              Create Your Account<br />
              <span className="highlight">Join Degree Planner</span>
            </h1>

            <form onSubmit={handleSubmit} className="register-form">
              {/* Account Information */}
              <div className="form-group">
                <label htmlFor="fullName">
                  Full Name
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="j.doe@aui.ma"
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
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••••"
                    required
                    minLength="6"
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

              <div className="form-group">
                <label htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <div className="password-input-wrapper">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••••"
                    required
                    minLength="6"
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              {/* Major Selection */}
              <div className="form-group">
                <label>Select Your Major</label>
                <div className="major-options">
                  {majors.map((major) => (
                    <label key={major.value} className="radio-card">
                      <input
                        type="radio"
                        name="major"
                        value={major.value}
                        checked={formData.major === major.value}
                        onChange={handleChange}
                        required
                      />
                      <span className="radio-label">{major.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Computer Science: Show Specialization and Minor - OPTIONAL */}
              {formData.major === 'computer-science' && (
                <>
                  <div className="form-group">
                    <label htmlFor="specialization">
                      Choose Your Specialization (Optional)
                    </label>
                    <select
                      id="specialization"
                      name="specialization"
                      value={formData.specialization}
                      onChange={handleChange}
                    >
                      <option value="">Select a specialization...</option>
                      {specializations.map((spec) => (
                        <option key={spec.value} value={spec.value}>
                          {spec.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="minor">
                      Choose Your Minor (Optional)
                    </label>
                    <select
                      id="minor"
                      name="minor"
                      value={formData.minor}
                      onChange={handleChange}
                    >
                      <option value="">Select a minor...</option>
                      {minors.map((minor) => (
                        <option key={minor.value} value={minor.value}>
                          {minor.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* General Engineering: Show Thematic Area - OPTIONAL */}
              {formData.major === 'general-engineering' && (
                <div className="form-group">
                  <label htmlFor="thematicArea">
                    Choose Your Thematic Area (Optional)
                  </label>
                  <select
                    id="thematicArea"
                    name="thematicArea"
                    value={formData.thematicArea}
                    onChange={handleChange}
                  >
                    <option value="">Select a thematic area...</option>
                    {generalEngineeringAreas.map((area) => (
                      <option key={area.value} value={area.value}>
                        {area.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* EMS: Show Thematic Area - OPTIONAL */}
              {formData.major === 'ems' && (
                <div className="form-group">
                  <label htmlFor="thematicArea">
                    Choose Your Thematic Area (Optional)
                  </label>
                  <select
                    id="thematicArea"
                    name="thematicArea"
                    value={formData.thematicArea}
                    onChange={handleChange}
                  >
                    <option value="">Select a thematic area...</option>
                    {emsAreas.map((area) => (
                      <option key={area.value} value={area.value}>
                        {area.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button type="submit" className="register-button">
                Create Account
              </button>

              <p className="login-link">
                Already have an account? <Link to="/login">Login</Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;