import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import Sidebar from './Sidebar/Sidebar';
import DegreeFlowchart from './DegreeFlowchart/DegreeFlowchart';
import SemesterPlanner from './Semesterplanner/Semesterplanner';
import AIChat from '../AIChatbot/AIChat';
import AIAssistantIcon from '../AIChatbot/AIAssistantIcon';
import './CreatePlanner.css';
import { API_BASE, clearStoredAuth, getStoredUser } from '../../api';

// "Spring 2026" -> sortable number (Spring, then Summer, then Fall within a calendar year)
const SEASON_ORDER = { Spring: 0, Summer: 1, Fall: 2 };
const semesterSortKey = (semester) => {
  const [season, year] = semester.split(' ');
  return Number(year) * 3 + (SEASON_ORDER[season] ?? 0);
};

export default function CreatePlanner() {
  const navigate = useNavigate();
  const [semesterCourses, setSemesterCourses] = useState({});
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [chatState, setChatState] = useState('hidden');
  const [userMajor, setUserMajor] = useState(null);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const loadSavedSemesters = async () => {
      try {
        const resp = await fetch(`${API_BASE}/semesters`, {
          method: 'GET',
          credentials: 'include'
        });
        if (!resp.ok) return;
        const data = await resp.json();
        if (data && Array.isArray(data.semesters)) {
          const mapped = {};
          data.semesters.forEach((sem) => {
            mapped[sem.semester] = sem.courses || [];
          });
          setSemesterCourses(mapped);
        }
      } catch (err) {
        console.error('Failed to load saved semesters', err);
      }
    };

    loadSavedSemesters();
  }, []);

  useEffect(() => {
    const loadUserData = async () => {
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
          if (data?.user) {
            setUserData({
              major: data.user.major,
              gpa: data.user.gpa || 0,
              completedCourses: []
            });
            setUserMajor(data.user.major);
            return;
          }
        }
      } catch (err) {
        console.error('Failed to fetch user data:', err);
      }

      // Server unreachable: fall back to the user cached at login
      const storedUser = getStoredUser();
      if (storedUser) {
        setUserData({
          major: storedUser.major,
          gpa: storedUser.gpa || 0,
          completedCourses: []
        });
        setUserMajor(storedUser.major);
      }
    };

    loadUserData();
  }, [navigate]);

  const handleToggle = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const handleChatOpen = () => {
    setChatState('minimized');
  };

  const handleChatClose = () => {
    setChatState('hidden');
  };

  // Intelligent AI suggestions based on actual course planning
  const generateIntelligentSuggestions = () => {
    const suggestions = [];
    
    // Get all semester keys in chronological order
    const semesterKeys = Object.keys(semesterCourses).sort(
      (a, b) => semesterSortKey(a) - semesterSortKey(b)
    );
    
    semesterKeys.forEach(semester => {
      const courses = semesterCourses[semester] || [];
      if (courses.length === 0) return;

      const courseCodes = courses.map(c => c.code);
      const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0);
      const isSummer = semester.includes('Summer');
      
      // Check 1: Heavy semester (17-21 credits)
      if (totalCredits >= 17 && totalCredits <= 21 && !isSummer) {
        suggestions.push({
          id: `heavy-${semester}`,
          text: `${semester} has ${totalCredits} credits - that's quite heavy! Make sure you can handle the workload.`,
          type: "warning"
        });
      }

      // Check 2: Over summer limit (12 credits)
      if (isSummer && totalCredits > 12) {
        suggestions.push({
          id: `summer-heavy-${semester}`,
          text: `${semester} has ${totalCredits} credits. Summer semesters should stay under 12 credits!`,
          type: "warning"
        });
      }

      // Check 3: Summer is very heavy with math + 2 CS courses
      if (isSummer) {
        const mathCourses = courses.filter(c => c.code.startsWith('MTH'));
        const csCourses = courses.filter(c => c.code.startsWith('CSC'));
        
        if (mathCourses.length >= 1 && csCourses.length >= 2) {
          suggestions.push({
            id: `summer-intense-${semester}`,
            text: `${semester}: Taking a math course with 2+ CS courses in summer is very intense. Consider replacing one with an easier course.`,
            type: "warning"
          });
        }
      }

      // Check 4: PHY 1402 + MTH 2301 together (both very hard)
      if (courseCodes.includes('PHY 1402') && courseCodes.includes('MTH 2301')) {
        suggestions.push({
          id: `hard-combo-${semester}`,
          text: `${semester}: Taking Physics 2 and Calculus 2 together is very challenging. Consider pairing them with easier courses.`,
          type: "warning"
        });
      }

      // Check 5: Software Engineering before Database
      if (courseCodes.includes('CSC 3324')) {
        // Check if database was taken in any previous semester
        const currentIndex = semesterKeys.indexOf(semester);
        const previousSemesters = semesterKeys.slice(0, currentIndex);
        
        const hasDatabaseBefore = previousSemesters.some(prevSem => {
          return (semesterCourses[prevSem] || []).some(c => c.code === 'CSC 3326');
        });

        if (!hasDatabaseBefore) {
          suggestions.push({
            id: `db-before-se-${semester}`,
            text: `${semester}: It's recommended to take Database Systems (CSC 3326) before Software Engineering (CSC 3324).`,
            type: "recommendation"
          });
        }
      }

      // Check 6: Multiple hard courses in one semester
      const hardCourses = courses.filter(c => 
        ['CSC 2302', 'CSC 3323', 'CSC 3351', 'MTH 2301', 'MTH 2304', 'PHY 1402', 'CHE 1401', 'CSC 3315'].includes(c.code)
      );

      if (hardCourses.length >= 3 && !isSummer) {
        suggestions.push({
          id: `multi-hard-${semester}`,
          text: `${semester}: You have ${hardCourses.length} challenging courses (${hardCourses.map(c => c.code).join(', ')}). Balance with easier courses if possible.`,
          type: "warning"
        });
      }

      // Check 7: Light semester that could take more
      if (totalCredits < 12 && !isSummer) {
        suggestions.push({
          id: `light-${semester}`,
          text: `${semester} only has ${totalCredits} credits. You could add more courses to stay on track for graduation.`,
          type: "info"
        });
      }
    });

    // Default suggestions if no semesters planned yet
    if (suggestions.length === 0) {
      return [
        {
          id: 1,
          text: "Start planning your semesters! Drag courses from the flowchart to a semester.",
          type: "info"
        },
        {
          id: 2,
          text: "Consider taking Data Structures (CSC 2302) early - it unlocks many advanced courses.",
          type: "recommendation"
        },
        {
          id: 3,
          text: "Try to balance theoretical and practical courses each semester for better learning.",
          type: "info"
        }
      ];
    }

    // Return top 3 most important suggestions
    return suggestions.slice(0, 3);
  };

  const aiSuggestions = generateIntelligentSuggestions();

  const groupSemestersByYear = () => {
    const semestersWithCourses = Object.keys(semesterCourses).filter(
      sem => semesterCourses[sem].length > 0
    );

    const yearGroups = {};
    
    semestersWithCourses.forEach(semester => {
      const parts = semester.split(' ');
      const season = parts[0];
      const year = parseInt(parts[1]);
      
      let academicYear;
      if (season === 'Fall') {
        academicYear = `${year}-${year + 1}`;
      } else {
        academicYear = `${year - 1}-${year}`;
      }
      
      if (!yearGroups[academicYear]) {
        yearGroups[academicYear] = {
          fall: null,
          spring: null,
          summer: null
        };
      }
      
      if (season === 'Fall') {
        yearGroups[academicYear].fall = semester;
      } else if (season === 'Spring') {
        yearGroups[academicYear].spring = semester;
      } else if (season === 'Summer') {
        yearGroups[academicYear].summer = semester;
      }
    });

    return yearGroups;
  };

  const yearGroups = groupSemestersByYear();

  return (
    <DndProvider backend={HTML5Backend}>
      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        onToggle={handleToggle} 
        activeTab="planner"
      />
      
      <div className={`create-planner ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="content-wrapper">
          <div className="create-planner-split">
            <div className="create-planner-left">
              <DegreeFlowchart userMajor={userMajor} />
            </div>
            <div className="create-planner-right">
              <SemesterPlanner 
                semesterCourses={semesterCourses}
                setSemesterCourses={setSemesterCourses}
              />
            </div>
          </div>

          <div className="degree-overview-section">
            <h2 className="degree-overview-title">View Current Degree Planner</h2>
            
            {Object.keys(yearGroups).length === 0 ? (
              <div className="no-courses-message">
                <p>No courses planned yet. Start by selecting a semester and dragging courses!</p>
              </div>
            ) : (
              <div className="academic-years-container">
                {Object.keys(yearGroups).sort().map(academicYear => {
                  const { fall, spring, summer } = yearGroups[academicYear];
                  
                  return (
                    <div key={academicYear} className="academic-year-row">
                      <div className="academic-year-label">
                        <h3>Academic Year {academicYear}</h3>
                      </div>
                      
                      <div className="semesters-row">
                        {fall && (
                          <div className="semester-overview-card">
                            <div className="semester-overview-header">
                              <h4 className="semester-overview-name">{fall}</h4>
                              <span className="semester-overview-credits">
                                {semesterCourses[fall].reduce((sum, c) => sum + c.credits, 0)} credits
                              </span>
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
                                {semesterCourses[fall].map(course => (
                                  <tr key={course.code}>
                                    <td className="course-code-small">{course.code}</td>
                                    <td className="course-title-small">{course.title}</td>
                                    <td className="course-credits-small">{course.credits}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {spring && (
                          <div className="semester-overview-card">
                            <div className="semester-overview-header">
                              <h4 className="semester-overview-name">{spring}</h4>
                              <span className="semester-overview-credits">
                                {semesterCourses[spring].reduce((sum, c) => sum + c.credits, 0)} credits
                              </span>
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
                                {semesterCourses[spring].map(course => (
                                  <tr key={course.code}>
                                    <td className="course-code-small">{course.code}</td>
                                    <td className="course-title-small">{course.title}</td>
                                    <td className="course-credits-small">{course.credits}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {summer && (
                          <div className="semester-overview-card">
                            <div className="semester-overview-header">
                              <h4 className="semester-overview-name">{summer}</h4>
                              <span className="semester-overview-credits">
                                {semesterCourses[summer].reduce((sum, c) => sum + c.credits, 0)} credits
                              </span>
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
                                {semesterCourses[summer].map(course => (
                                  <tr key={course.code}>
                                    <td className="course-code-small">{course.code}</td>
                                    <td className="course-title-small">{course.title}</td>
                                    <td className="course-credits-small">{course.credits}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Assistant Components - Positioned outside create-planner div */}
      {chatState === 'hidden' && (
        <AIAssistantIcon onClick={handleChatOpen} suggestions={aiSuggestions} />
      )}

      {chatState === 'minimized' && (
        <div style={{ 
          position: 'fixed', 
          bottom: '24px', 
          right: '24px', 
          width: '380px', 
          height: '500px',
          zIndex: 9999
        }}>
          <AIChat 
            onClose={handleChatClose} 
            isMinimized={true}
            studentProfile={userData || {}}
          />
        </div>
      )}
    </DndProvider>
  );
}