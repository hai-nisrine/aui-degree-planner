// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const authRequired = require('../middleware/auth');

const router = express.Router();

// Ensure users table exists (kept in sync with schema.sql)
const ensureUsersTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      major TEXT,
      minor TEXT,
      specialization TEXT,
      thematic_area TEXT,
      role TEXT NOT NULL DEFAULT 'student',
      gpa NUMERIC(3, 2),
      credits_completed INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT email_aui_format_chk CHECK (email ~* '^[a-z]\\.[a-z]+@aui\\.ma$')
    );
  `);
  // Databases created before these columns existed
  await pool.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS gpa NUMERIC(3, 2),
      ADD COLUMN IF NOT EXISTS credits_completed INTEGER NOT NULL DEFAULT 0;
  `);
};

const tableReady = ensureUsersTable();
// Avoid an unhandled rejection at startup; requests awaiting tableReady still see the error
tableReady.catch((err) => console.error('Failed to prepare users table:', err.message));

const USER_COLUMNS =
  'id, full_name, email, role, major, minor, specialization, thematic_area, gpa, credits_completed';

/**
 * Validate AUI email. Must match the database constraint: initial.lastname@aui.ma
 */
function isValidAuiEmail(email) {
  return typeof email === 'string' && /^[a-z]\.[a-z]+@aui\.ma$/i.test(email);
}

/**
 * Validate password:
 * - at least 8 characters
 * - at least 1 letter
 * - at least 1 number
 */
function isValidPassword(password) {
  if (typeof password !== 'string') return false;
  if (password.length < 8) return false;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return hasLetter && hasNumber;
}

// Allowed values for majors, specializations, thematic areas, and minors (aligned with the registration form)
const ALLOWED_MAJORS = [
  'general-engineering',
  'ems',
  'computer-science',
  'renewable-energies'
];

const CS_SPECIALIZATIONS = [
  'advanced-cs',
  'ai',
  'big-data',
  'cybersecurity',
  'computer-systems',
  'software-engineering'
];

const THEMATIC_AREAS_BY_MAJOR = {
  'general-engineering': ['mechatronics', 'biotech', 'aeronautics'],
  'ems': ['manufacturing', 'decision-support', 'biotech', 'finance']
};

// Minors are offered to Computer Science students
const ALLOWED_MINORS = [
  'business-admin',
  'english',
  'international-studies',
  'gender-studies',
  'african-studies',
  'human-resource',
  'human-rights',
  'organizational-studies',
  'communication',
  'psychology',
  'general-engineering',
  'mathematics',
  'logistics-and-supply-chain'
];

/**
 * Helper to trim empty strings to null
 */
function normalizeField(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }
  return value;
}

/**
 * Returns an error message if the major/specialization/thematic area/minor combination is invalid
 */
function validateProgram({ major, specialization, thematicArea, minor }) {
  if (!ALLOWED_MAJORS.includes(major)) {
    return 'Selected major is not valid.';
  }

  if (major === 'computer-science') {
    if (thematicArea !== null) {
      return 'Computer Science students should not select a thematic area.';
    }
    if (specialization !== null && !CS_SPECIALIZATIONS.includes(specialization)) {
      return 'Selected specialization is not valid for Computer Science.';
    }
    if (minor !== null && !ALLOWED_MINORS.includes(minor)) {
      return 'Selected minor is not valid.';
    }
    return null;
  }

  if (specialization !== null) {
    return 'This major should not include a specialization.';
  }
  if (minor !== null) {
    return 'Minors are only available for Computer Science students.';
  }
  const areas = THEMATIC_AREAS_BY_MAJOR[major] || [];
  if (thematicArea !== null && !areas.includes(thematicArea)) {
    return 'Selected thematic area is not valid for this major.';
  }
  return null;
}

// Shape returned to the frontend for a users row
function toUserResponse(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    major: row.major,
    minor: row.minor,
    specialization: row.specialization,
    thematicArea: row.thematic_area,
    gpa: row.gpa === null || row.gpa === undefined ? null : Number(row.gpa),
    credits: row.credits_completed || 0
  };
}

const cookieName = () => process.env.COOKIE_NAME || 'auth_token';

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax'
});

// Create a JWT for the user and store it in an httpOnly cookie
function setAuthCookie(res, row) {
  // Only identity and role go in the token; profile data is read fresh from the database
  const payload = { userId: row.id, email: row.email, role: row.role };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d'
  });

  res.cookie(cookieName(), token, {
    ...cookieOptions(),
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  });
}

/**
 * POST /auth/signup
 * Body:
 * {
 *   fullName,
 *   email,
 *   password,
 *   confirmPassword,
 *   major,
 *   minor,           // optional; only valid for CS
 *   specialization,  // optional; only valid for CS
 *   thematicArea     // optional; only valid for General Engineering and EMS
 * }
 */
router.post('/signup', async (req, res) => {
  try {
    await tableReady;

    const { password, confirmPassword } = req.body || {};
    const fullName = normalizeField(req.body?.fullName);
    const email = (normalizeField(req.body?.email) || '').toString().toLowerCase();
    const program = {
      major: normalizeField(req.body?.major),
      minor: normalizeField(req.body?.minor),
      specialization: normalizeField(req.body?.specialization),
      thematicArea: normalizeField(req.body?.thematicArea)
    };

    // 1. Basic required fields
    if (!fullName || !email || !password || !confirmPassword || !program.major) {
      return res.status(400).json({
        message: 'Full name, email, password, confirm password, and major are required.'
      });
    }

    // 2. Email format
    if (!isValidAuiEmail(email)) {
      return res.status(400).json({
        message: 'Email must be an AUI address in the form initial.lastname@aui.ma.'
      });
    }

    // 3. Password validation
    if (!isValidPassword(password)) {
      return res.status(400).json({
        message:
          'Password must be at least 8 characters long and contain at least one letter and one number.'
      });
    }

    // 4. Password confirmation
    if (password !== confirmPassword) {
      return res.status(400).json({
        message: 'Password and confirmation password do not match.'
      });
    }

    // 5. Major / specialization / thematic area / minor
    const programError = validateProgram(program);
    if (programError) {
      return res.status(400).json({ message: programError });
    }

    // 6. Check if email already exists
    const existing = await pool.query('SELECT 1 FROM users WHERE email = $1', [email]);
    if (existing.rowCount > 0) {
      return res.status(409).json({
        message: 'An account with this email already exists.'
      });
    }

    // 7. Hash password and insert
    const passwordHash = await bcrypt.hash(password, 10);
    const insertResult = await pool.query(
      `INSERT INTO users
        (full_name, email, password_hash, major, minor, specialization, thematic_area, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'student')
       RETURNING ${USER_COLUMNS}`,
      [
        fullName,
        email,
        passwordHash,
        program.major,
        program.minor,
        program.specialization,
        program.thematicArea
      ]
    );

    const user = insertResult.rows[0];

    // 8. Auto-login after signup
    setAuthCookie(res, user);

    res.status(201).json({
      message: 'Signup successful.',
      user: toUserResponse(user)
    });
  } catch (err) {
    console.error('Error in /auth/signup:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

/**
 * POST /auth/login
 * Body: { email, password }
 */
router.post('/login', async (req, res) => {
  try {
    await tableReady;

    const { password } = req.body || {};
    const email = (normalizeField(req.body?.email) || '').toString().toLowerCase();

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // Looser than signup so accounts created under older email rules can still log in
    if (!email.endsWith('@aui.ma')) {
      return res.status(400).json({ message: 'Email must be an AUI address (ends with @aui.ma).' });
    }

    const result = await pool.query(
      `SELECT ${USER_COLUMNS}, password_hash FROM users WHERE email = $1`,
      [email]
    );

    // Same message for unknown email and wrong password, so accounts can't be probed
    if (result.rowCount === 0) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const user = result.rows[0];

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    setAuthCookie(res, user);

    res.json({
      message: 'Login successful.',
      user: toUserResponse(user)
    });
  } catch (err) {
    console.error('Error in /auth/login:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

/**
 * POST /auth/logout - clear the auth cookie
 */
router.post('/logout', (_req, res) => {
  res.clearCookie(cookieName(), cookieOptions());
  res.json({ message: 'Logged out.' });
});

/**
 * GET /auth/me - return current user from JWT cookie
 */
router.get('/me', authRequired, async (req, res) => {
  try {
    await tableReady;
    const result = await pool.query(
      `SELECT ${USER_COLUMNS} FROM users WHERE id = $1`,
      [req.user.userId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json({ user: toUserResponse(result.rows[0]) });
  } catch (err) {
    console.error('Error in /auth/me:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

/**
 * PUT /auth/update-profile
 * Body: { gpa, credits }
 */
router.put('/update-profile', authRequired, async (req, res) => {
  try {
    await tableReady;

    const gpa = Number(req.body?.gpa);
    const credits = Number(req.body?.credits);

    if (!Number.isFinite(gpa) || gpa < 0 || gpa > 4) {
      return res.status(400).json({ message: 'GPA must be a number between 0 and 4.' });
    }
    if (!Number.isInteger(credits) || credits < 0 || credits > 200) {
      return res.status(400).json({ message: 'Credits must be a whole number between 0 and 200.' });
    }

    const result = await pool.query(
      `UPDATE users SET gpa = $1, credits_completed = $2
       WHERE id = $3
       RETURNING ${USER_COLUMNS}`,
      [gpa, credits, req.user.userId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json({ message: 'Profile updated.', user: toUserResponse(result.rows[0]) });
  } catch (err) {
    console.error('Error in /auth/update-profile:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
