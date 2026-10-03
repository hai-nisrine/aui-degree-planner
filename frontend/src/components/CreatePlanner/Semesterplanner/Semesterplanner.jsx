import React, { useEffect, useState } from 'react';
import CourseTable from '../CourseTable/CourseTable';
import './Semesterplanner.css';
import { API_BASE } from '../../../api';

// Academic years from three years ago to four years ahead, in chronological order
// (e.g. Fall 2026, Spring 2027, Summer 2027, ...)
const buildSemesters = () => {
  const currentYear = new Date().getFullYear();
  const list = [];
  for (let year = currentYear - 3; year <= currentYear + 3; year++) {
    list.push(`Fall ${year}`, `Spring ${year + 1}`, `Summer ${year + 1}`);
  }
  return list;
};

const semesters = buildSemesters();

export default function SemesterPlanner({ semesterCourses, setSemesterCourses }) {
  const [selectedSemester, setSelectedSemester] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const courses = selectedSemester ? (semesterCourses[selectedSemester] || []) : [];
  const totalCredits = courses.reduce((sum, course) => sum + course.credits, 0);
  
  // Check if it's a summer semester
  const isSummerSemester = selectedSemester.includes('Summer');
  const maxCredits = isSummerSemester ? 12 : 21;

  useEffect(() => {
    const stored = sessionStorage.getItem('plannerSelectedSemester');
    if (stored && semesters.includes(stored)) {
      setSelectedSemester(stored);
      sessionStorage.removeItem('plannerSelectedSemester');
    }
  }, []);

  useEffect(() => {
    setSaveMessage('');
  }, [selectedSemester]);

  const handleSemesterChange = (event) => {
    setSelectedSemester(event.target.value);
  };

  const checkPrerequisites = (course) => {
    if (!course.prerequisites || course.prerequisites.length === 0) {
      return { valid: true, message: '' };
    }

    const currentSemesterIndex = semesters.indexOf(selectedSemester);
    if (currentSemesterIndex === -1) return { valid: false, message: 'Invalid semester' };

    const previousSemesters = semesters.slice(0, currentSemesterIndex);
    const completedCourses = [];

    previousSemesters.forEach(semester => {
      const semesterCourseList = semesterCourses[semester] || [];
      semesterCourseList.forEach(c => completedCourses.push(c.code));
    });

    const missingPrereqs = course.prerequisites.filter(
      prereq => !completedCourses.includes(prereq)
    );

    if (missingPrereqs.length > 0) {
      return {
        valid: false,
        message: `Missing prerequisites: ${missingPrereqs.join(', ')}`
      };
    }

    return { valid: true, message: '' };
  };

  const handleAddCourse = (course) => {
    if (!selectedSemester) {
      alert('Please select a semester first!');
      return;
    }

    const currentCourses = semesterCourses[selectedSemester] || [];

    if (currentCourses.some(c => c.code === course.code)) {
      alert(`${course.code} is already in this semester!`);
      return;
    }

    const prereqCheck = checkPrerequisites(course);
    if (!prereqCheck.valid) {
      alert(`Cannot add ${course.code}.\n${prereqCheck.message}`);
      return;
    }

    const currentTotal = currentCourses.reduce((sum, c) => sum + c.credits, 0);
    if (currentTotal + course.credits > maxCredits) {
      alert(`Cannot exceed ${maxCredits} credits per semester!\nCurrent: ${currentTotal} credits`);
      return;
    }

    setSemesterCourses({
      ...semesterCourses,
      [selectedSemester]: [...currentCourses, course],
    });
  };

  const handleRemoveCourse = (courseCode) => {
    if (!selectedSemester) return;

    const currentCourses = semesterCourses[selectedSemester] || [];
    setSemesterCourses({
      ...semesterCourses,
      [selectedSemester]: currentCourses.filter(c => c.code !== courseCode),
    });
  };

  const handleConfirmSemester = async () => {
    if (!selectedSemester) {
      alert('Select a semester first.');
      return;
    }
    if (courses.length === 0) {
      alert('Add at least one course before confirming.');
      return;
    }
    try {
      setIsSaving(true);
      setSaveMessage('');
      const response = await fetch(`${API_BASE}/semesters/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          semester: selectedSemester,
          courses,
          totalCredits
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'Failed to save semester.');
      }
      setSaveMessage('Semester saved.');
    } catch (err) {
      console.error('Confirm semester error:', err);
      alert(err.message || 'Could not save semester. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="semester-planner">
      <h2 className="semester-planner-title">Semester Planner</h2>

      <div className="semester-dropdown-section">
        <label className="semester-dropdown-label">
          Select Semester
        </label>
        <select
          value={selectedSemester}
          onChange={handleSemesterChange}
          className="semester-dropdown"
        >
          <option value="">Choose a semester...</option>
          {semesters.map((semester) => (
            <option key={semester} value={semester}>
              {semester}
            </option>
          ))}
        </select>
      </div>

      {selectedSemester && (
        <div className="selected-semester">
          <h3 className="selected-semester-title">{selectedSemester}</h3>
          
          <CourseTable
            courses={courses}
            onAddCourse={handleAddCourse}
            onRemoveCourse={handleRemoveCourse}
          />
          
          <div className="credit-counter-wrapper">
            <div className={`credit-counter ${totalCredits > maxCredits ? 'danger' : 'normal'}`}>
              <span>Total Credits:</span>
              <span className="credit-value">{totalCredits} / {maxCredits}</span>
            </div>
          </div>

          <div className="semester-actions">
            <button
              className="confirm-semester-btn"
              onClick={handleConfirmSemester}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Confirm Semester'}
            </button>
          </div>

          {saveMessage && <p className="save-message">{saveMessage}</p>}

          {totalCredits > maxCredits && (
            <div className="credit-warning">
              Warning: You have exceeded the maximum of {maxCredits} credits per semester!
            </div>
          )}
        </div>
      )}

      {!selectedSemester && (
        <div className="empty-state">
          <p>Select a semester to start planning your courses</p>
        </div>
      )}
    </div>
  );
}