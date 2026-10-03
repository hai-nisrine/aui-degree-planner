const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Maps a major (as stored on the user) to the course fields that belong to it.
// A raw field code such as "CSC" is also accepted wherever a major is expected.
const MAJOR_FIELDS = {
    'computer-science': ['CSC'],
    'general-engineering': ['EGR'],
    'ems': ['EGR'],
    'renewable-energies': ['EGR']
};

const DEFAULT_SEMESTER_CREDITS = 15;
const MAX_SEMESTER_CREDITS = 21;

// Minimal RFC 4180 CSV parser: handles quoted fields, escaped quotes ("")
// and line breaks inside quoted fields (several course descriptions span lines).
function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;

    const endRow = () => {
        row.push(field);
        field = '';
        if (row.some(f => f.trim() !== '')) rows.push(row);
        row = [];
    };

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQuotes) {
            if (ch === '"' && text[i + 1] === '"') {
                field += '"';
                i++;
            } else if (ch === '"') {
                inQuotes = false;
            } else {
                field += ch;
            }
        } else if (ch === '"') {
            inQuotes = true;
        } else if (ch === ',') {
            row.push(field);
            field = '';
        } else if (ch === '\n' || ch === '\r') {
            if (ch === '\r' && text[i + 1] === '\n') i++;
            endRow();
        } else {
            field += ch;
        }
    }
    endRow();
    return rows;
}

// "MTH 2320 / MTH 2303" -> ['MTH 2320', 'MTH 2303']
const splitCodes = (value) => value.split('/').map(code => code.trim()).filter(Boolean);

// Course level from its number, e.g. "CSC 3324" -> 3
const courseLevel = (courseId) => {
    const match = courseId.match(/\d/);
    return match ? Number(match[0]) : 9;
};

class CourseService {
    constructor() {
        this.courses = [];
        this.courseIndex = new Map();   // any course code (or alias) -> course
        this.prerequisites = {};        // course id -> array of groups; each group is satisfied by any one code in it
        this.loadData();
    }

    loadData() {
        try {
            logger.info('Loading courses from CSV...');

            const coursesPath = path.join(__dirname, '../data/updated_coursesCSV.csv');
            this.parseCourses(fs.readFileSync(coursesPath, 'utf-8'));

            const prereqsPath = path.join(__dirname, '../data/updated_prereqsCSV.csv');
            this.parsePrerequisites(fs.readFileSync(prereqsPath, 'utf-8'));

            logger.info(`Loaded ${this.courses.length} courses`);
        } catch (error) {
            logger.error(`Error loading courses: ${error.message}`);
            throw error;
        }
    }

    parseCourses(csvData) {
        parseCsv(csvData).forEach((fields, index) => {
            if (fields.length < 5) {
                logger.warn(`Skipping malformed course row ${index + 1}`);
                return;
            }

            const [rawId, rawName, rawDescription, rawCredits, rawField] = fields;
            const courseId = rawId.trim();
            const courseName = rawName.trim();
            if (!courseId || !courseName) return;

            const description = rawDescription.trim();
            // "ERG" is a legacy spelling of the engineering field code
            const field = rawField.trim() === 'ERG' ? 'EGR' : (rawField.trim() || 'GEN');

            const course = {
                id: courseId,
                name: courseName,
                description,
                credits: parseInt(rawCredits, 10) || 3,
                major: field,
                difficulty: this.estimateDifficulty(courseName, description),
                type: this.classifyCourseType(courseName)
            };

            this.courses.push(course);
            this.courseIndex.set(courseId, course);
            // Cross-listed courses ("MTH 2320 / MTH 2303") are reachable by either code
            splitCodes(courseId).forEach(code => this.courseIndex.set(code, course));
        });
    }

    parsePrerequisites(csvData) {
        parseCsv(csvData).forEach(([rawCourse, rawPrereq]) => {
            if (!rawCourse || !rawPrereq) return;

            const course = this.getCourseById(rawCourse.trim());
            const courseId = course ? course.id : rawCourse.trim();
            const group = splitCodes(rawPrereq);
            if (group.length === 0) return;

            if (!this.prerequisites[courseId]) {
                this.prerequisites[courseId] = [];
            }
            this.prerequisites[courseId].push(group);
        });
    }

    estimateDifficulty(courseName, description) {
        const hardKeywords = ['advanced', 'graduate', 'complex', 'algorithm', 'neural', 'machine learning', 'compiler', 'systems'];
        const content = `${courseName} ${description}`.toLowerCase();

        const hardScore = hardKeywords.filter(kw => content.includes(kw)).length;

        if (hardScore >= 2) return 'hard';
        if (hardScore === 1) return 'medium';
        return 'easy';
    }

    classifyCourseType(courseName) {
        const practicalKeywords = ['lab', 'project', 'engineering', 'programming', 'design', 'iot', 'implementation'];
        const theoreticalKeywords = ['theory', 'analysis', 'foundations', 'discrete', 'calculus', 'algebra'];

        const name = courseName.toLowerCase();

        const practicalScore = practicalKeywords.filter(kw => name.includes(kw)).length;
        const theoreticalScore = theoreticalKeywords.filter(kw => name.includes(kw)).length;

        if (practicalScore > theoreticalScore) return 'practical';
        if (theoreticalScore > practicalScore) return 'theoretical';
        return 'mixed';
    }

    getAllCourses() {
        return this.courses;
    }

    getCourseById(courseId) {
        if (typeof courseId !== 'string') return undefined;
        return this.courseIndex.get(courseId.trim());
    }

    // Prerequisite groups for a course, e.g. [['MTH 2301'], ['MTH 2320', 'MTH 2303']]
    getPrerequisiteGroups(courseId) {
        const course = this.getCourseById(courseId);
        return (course && this.prerequisites[course.id]) || [];
    }

    // Human-readable prerequisites, e.g. ['MTH 2301', 'MTH 2320 / MTH 2303']
    getPrerequisites(courseId) {
        return this.getPrerequisiteGroups(courseId).map(group => group.join(' / '));
    }

    // True if any course in the group appears in the completed list
    isGroupSatisfied(group, completedCourses = []) {
        return group.some(code =>
            completedCourses.some(done => done === code || splitCodes(done).includes(code))
        );
    }

    getMissingPrerequisites(courseId, completedCourses = []) {
        return this.getPrerequisiteGroups(courseId)
            .filter(group => !this.isGroupSatisfied(group, completedCourses))
            .map(group => group.join(' / '));
    }

    isCompleted(course, completedCourses = []) {
        return completedCourses.includes(course.id) ||
            splitCodes(course.id).some(code => completedCourses.includes(code));
    }

    getPrerequisiteChain(courseId, visited = new Set()) {
        const course = this.getCourseById(courseId);
        const id = course ? course.id : courseId;
        if (visited.has(id)) return { direct: [], all: [], depth: 0 };

        visited.add(id);
        const directPrereqs = this.getPrerequisites(id);
        const allPrereqs = new Set(directPrereqs);
        let maxDepth = 0;

        this.getPrerequisiteGroups(id).flat().forEach(prereq => {
            const chain = this.getPrerequisiteChain(prereq, visited);
            chain.all.forEach(p => allPrereqs.add(p));
            maxDepth = Math.max(maxDepth, chain.depth + 1);
        });

        return {
            direct: directPrereqs,
            all: [...allPrereqs],
            depth: maxDepth
        };
    }

    // Courses that list the given course as a prerequisite (i.e. what it unlocks)
    getRelatedCourses(courseId) {
        const course = this.getCourseById(courseId);
        if (!course) return [];
        const codes = new Set([course.id, ...splitCodes(course.id)]);

        return this.courses
            .filter(other => this.getPrerequisiteGroups(other.id).some(group => group.some(code => codes.has(code))))
            .map(other => ({ id: other.id, name: other.name, credits: other.credits }));
    }

    filterCoursesByMajor(courses, major) {
        const fields = MAJOR_FIELDS[major] || [String(major).toUpperCase()];
        return courses.filter(c => fields.includes(c.major) || c.major === 'GEN');
    }

    // Courses not yet completed whose prerequisites are all satisfied
    filterByPrerequisites(courses, completedCourses = []) {
        return courses.filter(course =>
            !this.isCompleted(course, completedCourses) &&
            this.getMissingPrerequisites(course.id, completedCourses).length === 0
        );
    }

    // Order candidates: lower-level courses first, then those that unlock the most other courses
    prioritize(courses) {
        const unlocks = new Map(courses.map(c => [c.id, this.getRelatedCourses(c.id).length]));
        return [...courses].sort((a, b) =>
            courseLevel(a.id) - courseLevel(b.id) ||
            unlocks.get(b.id) - unlocks.get(a.id) ||
            a.id.localeCompare(b.id)
        );
    }

    createSemesterPlan(availableCourses, major, preferences = {}, year) {
        const requested = Number(preferences && preferences.maxCredits);
        const creditLimit = Number.isFinite(requested) && requested > 0
            ? Math.min(requested, MAX_SEMESTER_CREDITS)
            : DEFAULT_SEMESTER_CREDITS;

        const selected = [];
        let totalCredits = 0;
        this.prioritize(availableCourses).forEach(course => {
            if (totalCredits + course.credits <= creditLimit) {
                selected.push(course);
                totalCredits += course.credits;
            }
        });

        return {
            major,
            year,
            creditLimit,
            totalCredits,
            courses: selected.map(c => ({ id: c.id, name: c.name, credits: c.credits })),
            alternatives: availableCourses
                .filter(c => !selected.includes(c))
                .map(c => ({ id: c.id, name: c.name, credits: c.credits }))
        };
    }

    // Simulates semesters of `coursesPerSemester` courses until every course in the major is scheduled
    calculateGraduationTimeline(major, completedCourses = [], coursesPerSemester = 5) {
        const completed = [...completedCourses];
        let remaining = this.filterCoursesByMajor(this.courses, major)
            .filter(course => !this.isCompleted(course, completed));
        const remainingCodes = () => new Set(remaining.flatMap(c => [c.id, ...splitCodes(c.id)]));

        const semesters = [];
        while (remaining.length > 0) {
            const pending = remainingCodes();
            // A prerequisite outside this major's course list is assumed to be handled separately
            const available = remaining.filter(course =>
                this.getPrerequisiteGroups(course.id).every(group =>
                    this.isGroupSatisfied(group, completed) || !group.some(code => pending.has(code))
                )
            );
            if (available.length === 0) break;

            const chosen = this.prioritize(available).slice(0, coursesPerSemester);
            semesters.push({
                semester: semesters.length + 1,
                courses: chosen.map(c => ({ id: c.id, name: c.name, credits: c.credits })),
                credits: chosen.reduce((sum, c) => sum + c.credits, 0)
            });
            chosen.forEach(c => completed.push(c.id));
            remaining = remaining.filter(c => !chosen.includes(c));
        }

        return {
            major,
            coursesPerSemester,
            semestersNeeded: semesters.length,
            yearsNeeded: Math.ceil(semesters.length / 2),
            semesters,
            unschedulable: remaining.map(c => ({ id: c.id, name: c.name }))
        };
    }
}

module.exports = new CourseService();
