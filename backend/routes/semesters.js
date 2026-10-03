const express = require('express');
const pool = require('../db');
const authRequired = require('../middleware/auth');

const router = express.Router();

/**
 * Ensure storage table exists
 */
const ensureTable = async () => {
  // Create table with user_id stored as TEXT to support UUID user identifiers
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_semester_plan (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      semester TEXT NOT NULL,
      courses JSONB NOT NULL DEFAULT '[]'::jsonb,
      total_credits INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT user_semester_unique UNIQUE (user_id, semester)
    );
  `);
};

// Run once at module load, then awaited per-request
const tableReady = ensureTable();
tableReady.catch((err) => console.error('Failed to prepare user_semester_plan table:', err.message));

/**
 * Helper to safely extract userId from req.user
 */
const getUserIdFromReq = (req) => {
  const raw = req.user && req.user.userId;
  return raw ? String(raw) : null;
};

/**
 * POST /semesters/confirm
 * Save or update a semester for the authenticated user
 */
router.post('/confirm', authRequired, async (req, res) => {
  try {
    await tableReady;

    const userId = getUserIdFromReq(req);
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }

    const { semester, courses, totalCredits } = req.body || {};

    if (!semester || typeof semester !== 'string') {
      return res.status(400).json({ message: 'Semester is required.' });
    }

    if (!Array.isArray(courses) || courses.length === 0) {
      return res
        .status(400)
        .json({ message: 'At least one course is required.' });
    }

    // Normalize course objects defensively in case shapes differ
    const normalizedCourses = courses.map((c = {}) => ({
      // keep any extra fields, but let the normalized values below take precedence
      ...c,
      code: c.code || c.courseCode || '',
      title: c.title || c.name || '',
      credits: Number(c.credits ?? c.creditHours ?? 0) || 0,
      description: c.description || '',
      category: c.category || '',
      prerequisites: Array.isArray(c.prerequisites)
        ? c.prerequisites
        : []
    }));

    const total = Number(totalCredits);
    const computedTotal = normalizedCourses.reduce(
      (sum, c) => sum + (Number(c.credits) || 0),
      0
    );
    const finalTotal =
      Number.isFinite(total) && total > 0 ? total : computedTotal;

    await pool.query(
      `
        INSERT INTO user_semester_plan (user_id, semester, courses, total_credits, updated_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (user_id, semester)
        DO UPDATE SET
          courses = EXCLUDED.courses,
          total_credits = EXCLUDED.total_credits,
          updated_at = NOW()
      `,
      [userId, semester, JSON.stringify(normalizedCourses), finalTotal]
    );

    return res
      .status(200)
      .json({ message: 'Semester saved successfully.', totalCredits: finalTotal });
  } catch (err) {
    console.error('Error saving semester:', err);
    return res
      .status(500)
      .json({ message: 'Failed to save semester.' });
  }
});

/**
 * GET /semesters/recent
 * Fetch most recently updated semester for the user
 */
router.get('/recent', authRequired, async (req, res) => {
  try {
    await tableReady;

    const userId = getUserIdFromReq(req);
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }

    const { rows } = await pool.query(
      `
        SELECT
          semester,
          courses,
          total_credits AS "totalCredits",
          updated_at AS "updatedAt"
        FROM user_semester_plan
        WHERE user_id = $1
        ORDER BY updated_at DESC
        LIMIT 1
      `,
      [userId]
    );

    if (rows.length === 0) {
      return res.json({ semester: null });
    }

    return res.json({ semester: rows[0] });
  } catch (err) {
    console.error('Error fetching recent semester:', err);
    return res
      .status(500)
      .json({ message: 'Failed to fetch semester.' });
  }
});

/**
 * GET /semesters
 * List all saved semesters for the user
 */
router.get('/', authRequired, async (req, res) => {
  try {
    await tableReady;

    const userId = getUserIdFromReq(req);
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }

    const { rows } = await pool.query(
      `
        SELECT
          semester,
          courses,
          total_credits AS "totalCredits",
          updated_at AS "updatedAt"
        FROM user_semester_plan
        WHERE user_id = $1
        ORDER BY updated_at DESC
      `,
      [userId]
    );

    return res.json({ semesters: rows });
  } catch (err) {
    console.error('Error fetching semesters list:', err);
    return res
      .status(500)
      .json({ message: 'Failed to fetch semesters.' });
  }
});

/**
 * DELETE /semesters/:semester
 * Remove a saved semester for the user
 */
router.delete('/:semester', authRequired, async (req, res) => {
  try {
    await tableReady;

    const userId = getUserIdFromReq(req);
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }

    const semesterName = req.params.semester;
    if (!semesterName) {
      return res.status(400).json({ message: 'Semester name required.' });
    }

    await pool.query(
      `
        DELETE FROM user_semester_plan
        WHERE user_id = $1 AND semester = $2
      `,
      [userId, semesterName]
    );

    return res.status(200).json({ message: 'Semester deleted.' });
  } catch (err) {
    console.error('Error deleting semester:', err);
    return res
      .status(500)
      .json({ message: 'Failed to delete semester.' });
  }
});

module.exports = router;
