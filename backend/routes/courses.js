const express = require('express');
const pool = require('../db');

const router = express.Router();

const baseCourseColumns = `
  course_code  AS code,
  course_title AS title,
  course_creds AS credits,
  COALESCE(course_desc, '') AS description,
  course_field AS category
`;

const withPrereqsSelect = `
  SELECT
    ${baseCourseColumns},
    COALESCE(
      (
        SELECT json_agg(prerequisite ORDER BY prerequisite)
        FROM course_prerequisite cp
        WHERE cp.course = c.course_code
      ),
      '[]'::json
    ) AS prerequisites
  FROM course c
`;

// GET /courses - list all courses with prerequisites
router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query(`${withPrereqsSelect} ORDER BY course_field, course_code;`);
    res.json({ courses: rows });
  } catch (err) {
    console.error('Error fetching courses:', err);
    res.status(500).json({ message: 'Failed to fetch courses.' });
  }
});

// GET /courses/:code - single course with prerequisites
router.get('/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const { rows } = await pool.query(
      `${withPrereqsSelect} WHERE c.course_code = $1 LIMIT 1;`,
      [code]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Course not found.' });
    }
    res.json({ course: rows[0] });
  } catch (err) {
    console.error('Error fetching course by code:', err);
    res.status(500).json({ message: 'Failed to fetch course.' });
  }
});

module.exports = router;
