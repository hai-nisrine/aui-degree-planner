import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import CourseNode from '../CourseNode/CourseNode';
import './DegreeFlowchart.css';
import { API_BASE } from '../../../api';

const normalizeCategory = (category) => (category === 'ERG' ? 'EGR' : category);

const CORE_CODES = ['CSC 1300', 'CSC 1401', 'CSC 1402', 'CSC 2302', 'CSC 2305'];

// Grid layout for the CS Core (matches the provided screenshot)
const flowLayout = [
  { code: 'CSC 1300', col: 1, row: 1 },
  { code: 'CSC 1401', col: 2, row: 1 },
  { code: 'CSC 1402', col: 3, row: 1 },
  { code: 'CSC 2302', col: 1, row: 2 },
  { code: 'CSC 2305', col: 2, row: 2 }
];

const manualEdges = [
  { from: 'CSC 1300', to: 'CSC 1401' },
  { from: 'CSC 1401', to: 'CSC 1402' },
  { from: 'CSC 2302', to: 'CSC 2305' }
];

const COLUMN_WIDTH = 220;
const ROW_HEIGHT = 130;

const supportingFields = [
  { label: 'Mathematics', category: 'MTH' },
  { label: 'Engineering', category: 'EGR' },
  { label: 'Computer Science', category: 'CSC' },
  { label: 'Else', category: 'ELSE' }
];

export default function DegreeFlowchart({ userMajor }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [supportingField, setSupportingField] = useState(supportingFields[0].category);
  const [elseCategory, setElseCategory] = useState('');
  const [activeCode, setActiveCode] = useState('');

  const gridRef = useRef(null);
  const nodeRefs = useRef({});
  const [gridSize, setGridSize] = useState({ width: 0, height: 0 });
  const [nodePositions, setNodePositions] = useState({});

  useEffect(() => {
    let isMounted = true;
    const fetchCourses = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetch(`${API_BASE}/courses`);
        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }
        const data = await res.json();
        if (isMounted && Array.isArray(data.courses)) {
          setCourses(data.courses);
        } else if (isMounted) {
          setError('Unexpected response from server.');
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load courses from API.', err);
          setError('Unable to load courses right now. Please refresh.');
          setCourses([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchCourses();
    return () => {
      isMounted = false;
    };
  }, []);

  const courseMap = useMemo(() => {
    const map = new Map();
    courses.forEach((course) => {
      if (course?.code && CORE_CODES.includes(course.code)) {
        map.set(course.code, course);
      }
    });
    return map;
  }, [courses]);

  const { nodes, missingCodes } = useMemo(() => {
    const missing = [];
    const mapped = [];
    flowLayout.forEach((slot) => {
      const course = courseMap.get(slot.code);
      if (!course) {
        missing.push(slot.code);
        return;
      }
      mapped.push({ ...slot, course });
    });
    return { nodes: mapped, missingCodes: missing };
  }, [courseMap]);

  const nodeMap = useMemo(() => {
    const map = new Map();
    nodes.forEach((node) => {
      map.set(node.course.code, node);
    });
    return map;
  }, [nodes]);

  const otherCategoryOptions = useMemo(() => {
    const excluded = new Set(['CSC', 'MTH', 'EGR']);
    const unique = Array.from(
      new Set(
        courses
          .map((course) => normalizeCategory(course.category))
          .filter((cat) => cat)
      )
    ).filter((cat) => !excluded.has(cat));
    return unique.sort();
  }, [courses]);

  useEffect(() => {
    if (supportingField === 'ELSE' && !elseCategory && otherCategoryOptions.length > 0) {
      setElseCategory(otherCategoryOptions[0]);
    }
    if (supportingField !== 'ELSE') {
      setElseCategory('');
    }
  }, [supportingField, elseCategory, otherCategoryOptions]);

  const supportingCourses = useMemo(() => {
    let activeCategory = supportingField;
    if (supportingField === 'ELSE') {
      activeCategory = elseCategory || otherCategoryOptions[0];
    }
    if (!activeCategory) return [];

    return courses
      .filter((course) => normalizeCategory(course.category) === activeCategory)
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [courses, supportingField, elseCategory, otherCategoryOptions]);

  const edges = useMemo(() => {
    // Use manual edges so arrows always match the visual even if prereqs differ in the DB
    return manualEdges.filter(({ from, to }) => nodeMap.has(from) && nodeMap.has(to));
  }, [nodeMap]);

  const relatedCodes = useMemo(() => {
    if (!activeCode) return new Set();
    const set = new Set([activeCode]);
    edges.forEach(({ from, to }) => {
      if (from === activeCode) set.add(to);
      if (to === activeCode) set.add(from);
    });
    return set;
  }, [activeCode, edges]);

  const maxCol = useMemo(
    () => nodes.reduce((max, node) => Math.max(max, node.col), 1),
    [nodes]
  );

  const measurePositions = useCallback(() => {
    const gridEl = gridRef.current;
    if (!gridEl) return;
    const gridRect = gridEl.getBoundingClientRect();

    const positions = {};
    nodes.forEach((node) => {
      const el = nodeRefs.current[node.course.code];
      if (!el) return;
      const rect = el.getBoundingClientRect();
      positions[node.course.code] = {
        x: rect.left - gridRect.left + rect.width / 2,
        y: rect.top - gridRect.top + rect.height / 2,
        width: rect.width,
        height: rect.height
      };
    });

    const width = Math.max(gridEl.scrollWidth, gridRect.width, maxCol * COLUMN_WIDTH);
    const height = Math.max(gridEl.scrollHeight, gridRect.height, ROW_HEIGHT * 2);

    setGridSize({ width, height });
    setNodePositions(positions);
  }, [nodes, maxCol]);

  useLayoutEffect(() => {
    measurePositions();
  }, [measurePositions, loading]);

  useEffect(() => {
    window.addEventListener('resize', measurePositions);
    return () => window.removeEventListener('resize', measurePositions);
  }, [measurePositions]);

  const renderFlow = () => (
    <div className="flowchart-board">
      <div className="flowchart-scroll">
        <div className="flowchart-grid-layer">
          <svg
            className="flowchart-arrows"
            width={gridSize.width || '100%'}
            height={gridSize.height || '100%'}
            viewBox={`0 0 ${gridSize.width || 1} ${gridSize.height || 1}`}
            preserveAspectRatio="xMinYMin meet"
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="14"
                markerHeight="12"
                refX="12"
                refY="6"
                orient="auto"
                markerUnits="userSpaceOnUse"
              >
                <path d="M2,1 L2,11 L12,6 z" fill="#6c7aa7" />
              </marker>
            </defs>
            {edges.map((edge, idx) => {
              const from = nodePositions[edge.from];
              const to = nodePositions[edge.to];
              if (!from || !to) return null;

              const margin = 10;
              const fromRight = from.x + (from.width ? from.width / 2 : 0);
              const fromLeft = from.x - (from.width ? from.width / 2 : 0);
              const toRight = to.x + (to.width ? to.width / 2 : 0);
              const toLeft = to.x - (to.width ? to.width / 2 : 0);
              const isRightward = to.x >= from.x;

              let startX = isRightward ? fromRight + margin : fromLeft - margin;
              let endX = isRightward ? toLeft - margin : toRight + margin;
              const startY = from.y;
              const endY = to.y;

              if (isRightward && endX <= startX) {
                endX = startX + 12;
              }
              if (!isRightward && endX >= startX) {
                endX = startX - 12;
              }

              let points;
              if (startY === endY) {
                points = `M ${startX} ${startY} L ${endX} ${endY}`;
              } else {
                const corridorX = isRightward
                  ? Math.max(startX, endX) + 30
                  : Math.min(startX, endX) - 30;
                points = [
                  `M ${startX} ${startY}`,
                  `L ${corridorX} ${startY}`,
                  `L ${corridorX} ${endY}`,
                  `L ${endX} ${endY}`
                ].join(' ');
              }

              const isActiveEdge =
                activeCode &&
                (edge.from === activeCode || edge.to === activeCode);

              return (
                <path
                  key={`${edge.from}-${edge.to}-${idx}`}
                  d={points}
                  fill="none"
                  stroke={isActiveEdge ? '#5b72ff' : '#9ca3af'}
                  strokeWidth={isActiveEdge ? '3.6' : '2.8'}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  markerEnd="url(#arrowhead)"
                  opacity={isActiveEdge || !activeCode ? '0.95' : '0.4'}
                />
              );
            })}
          </svg>

          <div
            ref={gridRef}
            className="flowchart-grid"
            style={{
              gridTemplateColumns: `repeat(${maxCol}, ${COLUMN_WIDTH}px)`,
              gridAutoRows: `${ROW_HEIGHT}px`
            }}
          >
            {nodes.map((node) => {
              const isActive = activeCode && relatedCodes.has(node.course.code);
              const isMuted = activeCode && !relatedCodes.has(node.course.code);
              return (
                <div
                  key={node.course.code}
                  className={`flow-node-slot ${isActive ? 'slot-active' : ''} ${
                    isMuted ? 'slot-muted' : ''
                  }`}
                  style={{ gridColumn: node.col, gridRow: node.row }}
                  ref={(el) => {
                    if (el) {
                      nodeRefs.current[node.course.code] = el;
                    } else {
                      delete nodeRefs.current[node.course.code];
                    }
                  }}
                >
                  <CourseNode
                    course={node.course}
                    className={`${isActive ? 'node-active' : ''} ${isMuted ? 'node-muted' : ''}`}
                    onHover={setActiveCode}
                    onLeave={() => setActiveCode('')}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  const showMissingNotice = !loading && missingCodes.length > 0;

  return (
    <div className="flowchart">
      <div className="flowchart-heading">
        <div>
          <div className="flowchart-eyebrow">Computer Science Core</div>
          <h1 className="flowchart-title">Degree Flowchart</h1>
          <p className="flowchart-subtitle">
            Drag a course into the semester you are editing. Only the core courses from the catalog are shown here.
          </p>
        </div>
        {userMajor && (
          <div className="major-chip">
            {userMajor === 'computer-science' ? 'Computer Science' : userMajor}
          </div>
        )}
      </div>

      {loading && <p className="status-line">Loading courses...</p>}
      {error && <p className="status-line warning">{error}</p>}
      {showMissingNotice && (
        <p className="status-line warning">
          Missing in catalog: {missingCodes.join(', ')}
        </p>
      )}
      {!loading && !error && nodes.length === 0 && (
        <p className="status-line warning">
          No Computer Science core courses are available to render right now.
        </p>
      )}

      {nodes.length > 0 && renderFlow()}

      <div className="category-section">
        <h2 className="category-header">
          <span className="category-badge mathematics">Course Fields</span>
        </h2>
        <div className="field-filters">
          {supportingFields.map((field) => (
            <button
              key={field.category}
              className={`field-filter-btn ${supportingField === field.category ? 'active' : ''}`}
              onClick={() => setSupportingField(field.category)}
            >
              {field.label}
            </button>
          ))}
        </div>
        {supportingField === 'ELSE' && (
          <div className="filter-row">
            <label htmlFor="other-category-select" className="filter-label">
              Choose field
            </label>
            <select
              id="other-category-select"
              className="filter-select"
              value={elseCategory || ''}
              onChange={(e) => setElseCategory(e.target.value)}
            >
              {otherCategoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="course-grid-container">
          <div className="course-grid">
            {supportingCourses.map((course) => (
              <CourseNode key={course.code} course={course} />
            ))}
          </div>
        </div>
      </div>

      <div className="instructions">
        <h3 className="instructions-title">How to use</h3>
        <ul className="instructions-list">
          <li>Hover to see details, then drag a card to the semester planner.</li>
          <li>Arrows follow the prerequisite paths within these core courses.</li>
          <li>Layout adapts on smaller screens - scroll horizontally if needed.</li>
        </ul>
      </div>
    </div>
  );
}
