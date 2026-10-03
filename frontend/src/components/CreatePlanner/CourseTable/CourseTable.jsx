import React from 'react';
import { useDrop } from 'react-dnd';
import './CourseTable.css';

export default function CourseTable({ courses, onAddCourse, onRemoveCourse }) {
  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: 'course',
      drop: (item) => onAddCourse(item),
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
      }),
    }),
    [onAddCourse]
  );

  return (
    <div ref={drop} className={`course-table-container ${isOver ? 'drop-hover' : ''}`}>
      <table className="course-table">
        <thead>
          <tr>
            <th>Course Code</th>
            <th>Course Title</th>
            <th>Credits</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {courses.length === 0 ? (
            <tr>
              <td colSpan={4} className="empty-state-cell">
                <div className="empty-state">
                  <p className="empty-state-title">Drag and drop courses here</p>
                  <p className="empty-state-subtitle">Or select courses from the flowchart on the left</p>
                </div>
              </td>
            </tr>
          ) : (
            courses.map((course) => (
              <tr key={course.code}>
                <td className="course-code">{course.code}</td>
                <td>
                  <div className="course-title">{course.title}</div>
                  {course.prerequisites && course.prerequisites.length > 0 && (
                    <div className="course-prerequisites">
                      Prerequisites: {course.prerequisites.join(', ')}
                    </div>
                  )}
                </td>
                <td>
                  <span className="course-credits-badge">
                    {course.credits} credits
                  </span>
                </td>
                <td>
                  <button
                    onClick={() => onRemoveCourse(course.code)}
                    className="remove-button"
                    title="Remove course"
                  >
                    &times;
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
