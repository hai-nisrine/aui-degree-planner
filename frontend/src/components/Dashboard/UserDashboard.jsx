import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './UserDashboard.css';
import './SemesterActions.css';
import AIChat from '../AIChatbot/AIChat';
import AIAssistantIcon from '../AIChatbot/AIAssistantIcon';
import { API_BASE, clearStoredAuth, getStoredUser, logout } from '../../api';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

function UserDashboard() {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today.getDate());
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [chatState, setChatState] = useState('hidden');
  const [userData, setUserData] = useState(null);
  const [semesters, setSemesters] = useState([]);
  const [isEditingStats, setIsEditingStats] = useState(false);
  const [tempGPA, setTempGPA] = useState('');
  const [tempCredits, setTempCredits] = useState('');

  const labelMaps = useMemo(
    () => ({
      majors: {
        'general-engineering': 'General Engineering',
        'ems': 'Engineering and Management Sciences',
        'computer-science': 'Computer Science',
        'renewable-energies': 'Renewable Energies'
      },
      specializations: {
        'advanced-cs': 'Advanced Computer Science',
        'ai': 'Artificial Intelligence',
        'big-data': 'Big Data Analytics',
        'cybersecurity': 'Cybersecurity',
        'computer-systems': 'Computer Systems',
        'software-engineering': 'Software Engineering'
      },
      thematicAreas: {
        'mechatronics': 'Mechatronics',
        'biotech': 'BioTech',
        'aeronautics': 'Aeronautics',
        'manufacturing': 'Manufacturing and Logistics Engineering',
        'decision-support': 'Decision Support Systems',
        'finance': 'Finance'
      },
      minors: {
        'business-admin': 'Business Administration',
        'english': 'English',
        'international-studies': 'International Studies',
        'gender-studies': 'Gender Studies',
        'african-studies': 'African Studies',
        'human-resource': 'Human Resource Development',
        'human-rights': 'Human Rights and Development',
        'organizational-studies': 'Organizational Studies',
        'communication': 'Communication',
        'psychology': 'Psychology',
        'general-engineering': 'General Engineering',
        'mathematics': 'Mathematics',
        'logistics-and-supply-chain': 'Logistics and Supply Chain'
      }
    }),
    []
  );

  // Get total credits needed based on major
  const getTotalCredits = (major) => {
    const creditsByMajor = {
      'renewable-energies': 135,
      'general-engineering': 136,
      'ems': 134,
      'computer-science': 134
    };
    return creditsByMajor[major] || 138; // Default to 138 if major not found
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const resp = await fetch(`${API_BASE}/auth/me`, {
          method: 'GET',
          credentials: 'include'
        });
        
        if (resp.status === 401) {
          clearStoredAuth();
          navigate('/login');
          return;
        }
        if (resp.ok) {
          const data = await resp.json();
          const major = data.user.major;
          setUserData({
            name: data.user.fullName || 'Student',
            major: major,
            minor: data.user.minor,
            specialization: data.user.specialization,
            thematicArea: data.user.thematicArea,
            credits: data.user.credits || 0,
            totalCredits: getTotalCredits(major),
            gpa: data.user.gpa || 0
          });
          return;
        }
      } catch (err) {
        console.error('Failed to fetch /auth/me:', err);
      }

      // Server unreachable: fall back to the user cached at login
      const storedUser = getStoredUser();
      if (storedUser) {
        setUserData({
          name: storedUser.fullName || 'Student',
          major: storedUser.major,
          minor: storedUser.minor,
          specialization: storedUser.specialization,
          thematicArea: storedUser.thematicArea,
          credits: storedUser.credits || 0,
          totalCredits: getTotalCredits(storedUser.major),
          gpa: storedUser.gpa || 0
        });
      }
    };

    loadUser();
  }, [navigate]);

  useEffect(() => {
    const fetchSemesters = async () => {
      try {
        const resp = await fetch(`${API_BASE}/semesters`, {
          method: 'GET',
          credentials: 'include'
        });
        if (!resp.ok) return;
        const data = await resp.json();
        if (data && Array.isArray(data.semesters)) {
          setSemesters(data.semesters);
        }
      } catch (err) {
        console.error('Failed to fetch semesters:', err);
      }
    };

    fetchSemesters();
  }, []);

  const parseSemesterKey = (semesterStr) => {
    if (typeof semesterStr !== 'string') return { year: 0, seasonRank: 0 };
    const [season, yearStr] = semesterStr.split(' ');
    const year = Number(yearStr) || 0;
    const seasonOrder = { Spring: 0, Summer: 1, Fall: 2 };
    return { year, seasonRank: seasonOrder[season] ?? 0 };
  };

  const orderedSemesters = [...semesters].sort((a, b) => {
    const ak = parseSemesterKey(a.semester);
    const bk = parseSemesterKey(b.semester);
    if (ak.year !== bk.year) return ak.year - bk.year;
    if (ak.seasonRank !== bk.seasonRank) return ak.seasonRank - bk.seasonRank;
    const at = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const bt = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return at - bt;
  });

  const handleDeleteSemester = async (semesterName) => {
    try {
      const resp = await fetch(`${API_BASE}/semesters/${encodeURIComponent(semesterName)}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!resp.ok) {
        console.error('Failed to delete semester');
        return;
      }
      setSemesters(prev => prev.filter(s => s.semester !== semesterName));
    } catch (err) {
      console.error('Failed to delete semester', err);
    }
  };

  const handleModifySemester = (semesterName) => {
    sessionStorage.setItem('plannerSelectedSemester', semesterName);
    navigate('/create-planner');
  };

  const handleEditStats = () => {
    setTempGPA(userData?.gpa?.toString() || '0');
    setTempCredits(userData?.credits?.toString() || '0');
    setIsEditingStats(true);
  };

  const handleSaveStats = async () => {
    const newGPA = parseFloat(tempGPA);
    const newCredits = parseInt(tempCredits);
    const maxCredits = getTotalCredits(userData?.major);
    
    // Validation
    if (isNaN(newGPA) || newGPA < 0 || newGPA > 4) {
      alert('Please enter a valid GPA between 0 and 4');
      return;
    }
    
    if (isNaN(newCredits) || newCredits < 0 || newCredits > maxCredits) {
      alert(`Please enter valid credits between 0 and ${maxCredits}`);
      return;
    }

    try {
      const resp = await fetch(`${API_BASE}/auth/update-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ gpa: newGPA, credits: newCredits })
      });
      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        alert(data.message || 'Could not save your statistics. Please try again.');
        return;
      }

      setUserData(prev => ({ ...prev, gpa: newGPA, credits: newCredits }));
      setIsEditingStats(false);
    } catch (err) {
      console.error('Failed to update stats:', err);
      alert('Could not reach the server. Please try again.');
    }
  };

  const handleCancelStats = () => {
    setIsEditingStats(false);
    setTempGPA('');
    setTempCredits('');
  };

  const calculateGraduationDate = (completedCredits, major) => {
    const credits = completedCredits || 0;
    const totalCredits = getTotalCredits(major);
    const currentYear = new Date().getFullYear();
    
    if (credits >= totalCredits) {
      return 'Completed';
    }
    
    let yearsUntilGraduation;
    
    // Calculate based on percentage of completion
    const percentComplete = (credits / totalCredits) * 100;
    
    if (percentComplete >= 75) {
      yearsUntilGraduation = 1;
    } else if (percentComplete >= 51) {
      yearsUntilGraduation = 2;
    } else if (percentComplete >= 24) {
      yearsUntilGraduation = 3;
    } else {
      yearsUntilGraduation = 4;
    }
    
    return (currentYear + yearsUntilGraduation).toString();
  };

  const completionPercentage = userData
    ? Math.round(((userData.credits || 0) / (userData.totalCredits || 1)) * 100)
    : 0;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const handleChatOpen = () => {
    setChatState('minimized');
  };

  const handleChatClose = () => {
    setChatState('hidden');
  };

  const creditsRemaining = Math.max(0, (userData?.totalCredits || 0) - (userData?.credits || 0));
  const plannedCredits = semesters.reduce((sum, s) => sum + (Number(s.totalCredits) || 0), 0);

  const aiSuggestions = [
    {
      id: 1,
      text: `You're ${completionPercentage}% done with your degree.`,
      type: "success"
    },
    {
      id: 2,
      text: semesters.length > 0
        ? `You have ${semesters.length} planned semester${semesters.length === 1 ? '' : 's'} and ${creditsRemaining} credits left to complete.`
        : `You have ${creditsRemaining} credits left. Let me help you plan your next semester!`,
      type: "info"
    },
    {
      id: 3,
      text: userData?.gpa
        ? `Your current GPA is ${Number(userData.gpa).toFixed(2)}.`
        : 'Add your GPA and completed credits in Academic Statistics to track your progress.',
      type: userData?.gpa ? "success" : "info"
    }
  ];

  // Calendar for the current month
  const calendarYear = today.getFullYear();
  const calendarMonth = today.getMonth();
  const firstWeekday = new Date(calendarYear, calendarMonth, 1).getDay();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();

  return (
    <div className="dashboard">
      {/* Left Sidebar */}
      <aside className={`sidebar-container ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <button className="sidebar-toggle" onClick={toggleSidebar}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {isSidebarCollapsed ? <path d="M9 18l6-6-6-6"/> : <path d="M15 18l-6-6 6-6"/>}
          </svg>
        </button>

        <div className="sidebar-header">
          <svg className="sidebar-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/>
          </svg>
          {!isSidebarCollapsed && <span className="sidebar-title">AUI Planner</span>}
        </div>

        {!isSidebarCollapsed && <div className="sidebar-label">GENERAL</div>}
        
        <button 
          className={`sidebar-btn ${activeMenu === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveMenu('dashboard')} 
          title="Dashboard"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7"/>
            <rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/>
          </svg>
          {!isSidebarCollapsed && <span>Dashboard</span>}
        </button>

        <button 
          className={`sidebar-btn ${activeMenu === 'planner' ? 'active' : ''}`}
          onClick={() => { setActiveMenu('planner'); navigate('/create-planner'); }} 
          title="Degree Planner"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
          {!isSidebarCollapsed && <span>Degree Planner</span>}
        </button>

        <button 
          className="sidebar-btn logout" 
          onClick={handleLogout} 
          title="Log out"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          {!isSidebarCollapsed && <span>Log out</span>}
        </button>
      </aside>

      {/* Main Content */}
      <main className={`main-content-area ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="content-header">
          <span className="section-label">Student Space</span>
        </div>
        <div className="content-wrapper">
          <div className="greeting-block">
            <h1>Hey {userData?.name?.split(' ')[0] || 'Student'} !</h1>
            <p>Ready to crush your goals? Let's keep your degree plan on track.</p>
          </div>

          {/* Info Cards Grid */}
          <div className="info-cards-grid">
            {/* Card 1: Student Info - NO MAJOR */}
            <div className="info-card-new info-card-large">
              <div className="card-icon-new">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div className="card-content-new">
                <h4>Student Information</h4>
                <div className="info-row">
                  <span className="info-label">Full Name:</span>
                  <span className="info-value">{userData?.name || 'Student'}</span>
                </div>
              </div>
            </div>

            {/* Card 2: Academic Program */}
            <div className="info-card-new info-card-large">
              <div className="card-icon-new">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 14l9-5-9-5-9 5 9 5z"/>
                  <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/>
                </svg>
              </div>
              <div className="card-content-new">
                <h4>Academic Program</h4>
                <div className="info-row">
                  <span className="info-label">Major:</span>
                  <span className="info-value">
                    {labelMaps.majors[userData?.major] || userData?.major || '—'}
                  </span>
                </div>
                {userData?.major === 'computer-science' && (
                  <>
                    <div className="info-row">
                      <span className="info-label">Minor:</span>
                      <span className="info-value">
                        {labelMaps.minors[userData?.minor] || userData?.minor || '—'}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Specialization:</span>
                      <span className="info-value">
                        {labelMaps.specializations[userData?.specialization] || userData?.specialization || '—'}
                      </span>
                    </div>
                  </>
                )}
                {(userData?.major === 'general-engineering' || userData?.major === 'ems') && (
                  <div className="info-row">
                    <span className="info-label">Thematic Area:</span>
                    <span className="info-value">
                      {labelMaps.thematicAreas[userData?.thematicArea] || userData?.thematicArea || 'Not specified'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Card 3: Academic Stats - SINGLE EDIT BUTTON */}
            <div className="info-card-new info-card-large">
              <div className="card-header-with-edit">
                <div className="card-icon-new">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                </div>
                <h4>Academic Statistics</h4>
                {!isEditingStats && (
                  <button className="card-edit-btn" onClick={handleEditStats} title="Edit statistics">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                )}
              </div>
              
              <div className="card-content-new">
                {/* Credits Row */}
                <div className="info-row">
                  <span className="info-label">Credits Completed:</span>
                  {!isEditingStats ? (
                    <span className="info-value">
                      {userData?.credits || 0} / {userData?.totalCredits || 138}
                    </span>
                  ) : (
                    <div className="edit-input-inline">
                      <input
                        type="number"
                        className="stats-edit-input"
                        value={tempCredits}
                        onChange={(e) => setTempCredits(e.target.value)}
                        min="0"
                        max={getTotalCredits(userData?.major)}
                        placeholder="Credits"
                      />
                      <span className="input-suffix">/ {userData?.totalCredits || 138}</span>
                    </div>
                  )}
                </div>

                {/* GPA Row */}
                <div className="info-row">
                  <span className="info-label">Current GPA:</span>
                  {!isEditingStats ? (
                    <span className="info-value">{userData?.gpa?.toFixed(2) || '0.00'}</span>
                  ) : (
                    <div className="edit-input-inline">
                      <input
                        type="number"
                        className="stats-edit-input"
                        value={tempGPA}
                        onChange={(e) => setTempGPA(e.target.value)}
                        step="0.01"
                        min="0"
                        max="4"
                        placeholder="GPA"
                      />
                      <span className="input-suffix">/ 4.0</span>
                    </div>
                  )}
                </div>

                {/* Save/Cancel Buttons */}
                {isEditingStats && (
                  <div className="stats-edit-actions">
                    <button className="stats-save-btn" onClick={handleSaveStats}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      Save Changes
                    </button>
                    <button className="stats-cancel-btn" onClick={handleCancelStats}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                      Cancel
                    </button>
                  </div>
                )}

                {/* Expected Graduation */}
                <div className="info-row">
                  <span className="info-label">Expected Graduation:</span>
                  <span className="info-value graduation-value">
                    {calculateGraduationDate(userData?.credits || 0, userData?.major)}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 4: Courses Left */}
            <div className="info-card-new info-card-large">
              <div className="card-icon-new">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
              </div>
              <div className="card-content-new">
                <h4>Remaining &amp; Planned</h4>
                <div className="info-row">
                  <span className="info-label">Credits Remaining:</span>
                  <span className="info-value">{creditsRemaining}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Semesters Planned:</span>
                  <span className="info-value">{semesters.length}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Credits Planned:</span>
                  <span className="info-value">{plannedCredits}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Semester Card */}
          <div className="recent-semester-card">
            <div className="card-header">
              <h3>View Your Recent Semesters</h3>
              <button className="create-semester-btn" onClick={() => navigate('/create-planner')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Go to Planner
              </button>
            </div>

            {orderedSemesters.length === 0 ? (
              <div className="empty-semester-content">
                <div className="empty-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </svg>
                </div>
                <p className="empty-text">No semester plans created yet</p>
                <p className="empty-subtext">Create a semester in the planner and confirm it to see it here.</p>
              </div>
            ) : (
              <div className="recent-semester-list">
                {orderedSemesters.map((sem) => (
                  <div key={`${sem.semester}-${sem.updatedAt}`} className="recent-semester-content">
                    <div className="recent-semester-header">
                      <div>
                        <h4 className="recent-semester-name">{sem.semester}</h4>
                        <span className="recent-semester-credits">{sem.totalCredits} credits</span>
                      </div>
                    </div>
                    <table className="semester-overview-table">
                      <thead>
                        <tr>
                          <th>Code</th>
                          <th>Title</th>
                          <th>Cr</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(sem.courses || []).map((course) => (
                          <tr key={course.code}>
                            <td className="course-code-small">{course.code}</td>
                            <td className="course-title-small">{course.title}</td>
                            <td className="course-credits-small">{course.credits}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="recent-semester-footer">
                      <span className="last-updated-text">
                        Last updated: {sem.updatedAt ? new Date(sem.updatedAt).toLocaleString() : 'N/A'}
                      </span>
                      <div className="semester-actions-row">
                        <button
                          className="sem-action-btn modify"
                          onClick={() => handleModifySemester(sem.semester)}
                        >
                          Modify
                        </button>
                        <button
                          className="sem-action-btn delete"
                          onClick={() => handleDeleteSemester(sem.semester)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {chatState === 'hidden' && (
            <AIAssistantIcon 
              onClick={handleChatOpen} 
              suggestions={aiSuggestions} 
            />
          )}

          {chatState === 'minimized' && (
            <div className="fixed bottom-6 right-6 z-[9999]" style={{ width: '380px', height: '480px' }}>
              <AIChat
                onClose={handleChatClose}
                isMinimized={true}
                studentProfile={{ major: userData?.major }}
              />
            </div>
          )}
        </div>
      </main>

      {/* Right Sidebar */}
      <aside className="right-panel">
        <div className="panel-header">
          <span className="section-label">Overview</span>
        </div>
        <div className="calendar-widget">
          <div className="calendar-header">
            <span className="month-badge">{MONTH_NAMES[calendarMonth]} {calendarYear}</span>
          </div>

          <div className="calendar-grid">
            <div className="cal-day-label">S</div>
            <div className="cal-day-label">M</div>
            <div className="cal-day-label">T</div>
            <div className="cal-day-label">W</div>
            <div className="cal-day-label">T</div>
            <div className="cal-day-label">F</div>
            <div className="cal-day-label">S</div>

            {[...Array(firstWeekday)].map((_, i) => (
              <div key={`empty-${i}`} className="cal-day-num empty"></div>
            ))}

            {[...Array(daysInMonth)].map((_, i) => (
              <div 
                key={i} 
                className={`cal-day-num ${i + 1 === today.getDate() ? 'today' : ''} ${i + 1 === selectedDate ? 'selected' : ''}`}
                onClick={() => setSelectedDate(i + 1)}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        <div className="degree-status-card">
          <h3>Degree Completion Status</h3>
          
          <div className="completion-circle-container">
            <svg className="completion-circle" viewBox="0 0 200 200">
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="#ffffff"
                strokeWidth="16"
              />
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="url(#gradient)"
                strokeWidth="16"
                strokeDasharray={`${completionPercentage * 5.03} 503`}
                strokeLinecap="round"
                transform="rotate(-90 100 100)"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#a78bfa" />
                </linearGradient>
              </defs>
            </svg>
            <div className="completion-text">
              <span className="completion-percentage">{completionPercentage}%</span>
              <span className="completion-label">Complete</span>
            </div>
          </div>
        </div>

        <div className="useful-links-card">
          <h3>Useful Links</h3>
          <div className="links-list">
            <a href="https://my.aui.ma/ICS" className="link-item" target="_blank" rel="noopener noreferrer">
              <span>AUI Portal</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="7" y1="17" x2="17" y2="7"/>
                <polyline points="7 7 17 7 17 17"/>
              </svg>
            </a>
            <a href="https://aui.ma/academic-calendars" className="link-item" target="_blank" rel="noopener noreferrer">
              <span>Academic Calendar</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="7" y1="17" x2="17" y2="7"/>
                <polyline points="7 7 17 7 17 17"/>
              </svg>
            </a>
            <a href="https://aui.ma/academic-catalogs" className="link-item" target="_blank" rel="noopener noreferrer">
              <span>Academic Catalogue</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="7" y1="17" x2="17" y2="7"/>
                <polyline points="7 7 17 7 17 17"/>
              </svg>
            </a>
            <a href="https://alakhawayn365.sharepoint.com/sites/MySSE/SitePages/SSE-Programs.aspx" className="link-item" target="_blank" rel="noopener noreferrer">
              <span>Major Flowcharts</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="7" y1="17" x2="17" y2="7"/>
                <polyline points="7 7 17 7 17 17"/>
              </svg>
            </a>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default UserDashboard;