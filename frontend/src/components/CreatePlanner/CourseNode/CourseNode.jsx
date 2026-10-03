import React, { useState } from 'react';
import { useDrag } from 'react-dnd';
import './CourseNode.css';

export default function CourseNode({ course, className = '', onHover, onLeave }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const codeLabel = course.displayCode || course.code;

  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'course',
    item: course,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <div className="course-node-wrapper">
      <div
        ref={drag}
        onMouseEnter={() => {
          setShowTooltip(true);
          if (onHover) onHover(course.code);
        }}
        onMouseLeave={() => {
          setShowTooltip(false);
          if (onLeave) onLeave();
        }}
        className={`course-node ${isDragging ? 'dragging' : ''} ${className}`.trim()}
      >
        <div className="course-node-content">
          <div className="course-node-code">{codeLabel}</div>
          <div className="course-node-title">{course.title}</div>
        </div>
      </div>

      {showTooltip && (
        <div className="course-tooltip">
          <div className="course-tooltip-code">{codeLabel}</div>
          <div className="course-tooltip-description">{course.description}</div>
          <div className="course-tooltip-info">
            <span>Credits: {course.credits}</span>
            {course.prerequisites && course.prerequisites.length > 0 && (
              <span className="course-tooltip-prereqs">
                Prereqs: {course.prerequisites.length}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
