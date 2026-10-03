const aiService = require('../services/aiService');
const courseService = require('../services/courseService');
const { chatRateLimiter } = require('../utils/rateLimiter');
const { NotFoundError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

// Load minors data
let minorsData = {};
try {
    const minorsPath = path.join(__dirname, '../data/minors.json');
    minorsData = JSON.parse(fs.readFileSync(minorsPath, 'utf-8'));
} catch (error) {
    logger.warn('Could not load minors data');
}

// Chat with AI advisor
exports.chat = async (req, res, next) => {
    try {
        const { message, studentProfile } = req.body;
        // The chat endpoint is public, so rate-limit per client address
        const userId = req.ip || 'anonymous';

        // Rate limiting
        if (!chatRateLimiter.isAllowed(userId)) {
            return res.status(429).json({
                success: false,
                error: {
                    message: 'Too many chat requests. Please try again later.',
                    retryAfter: chatRateLimiter.getResetTime(userId)
                }
            });
        }

        logger.info('Chat request received');

        // Get ALL courses with their prerequisites
        const allCourses = courseService.getAllCourses();
        
        const coursesWithPrereqs = allCourses.map(course => {
            const prereqs = courseService.getPrerequisites(course.id);
            return {
                ...course,
                prerequisites: prereqs.length > 0 ? prereqs.join(', ') : 'None'
            };
        });

        // Check if question is about minors
        const lowerMessage = message.toLowerCase();
        let minorInfo = '';
        if (lowerMessage.includes('minor') || lowerMessage.includes('business administration')) {
            const baMinor = minorsData.BUSINESS_ADMINISTRATION;
            if (baMinor) {
                minorInfo = `\n\nBusiness Administration Minor Requirements:
Required Courses (9 credits):
${baMinor.required_courses.map(c => `- ${c.code}: ${c.name} (${c.credits} credits)`).join('\n')}

Elective Courses (choose ${baMinor.elective_courses.choose} for 6 credits):
${baMinor.elective_courses.from.map(code => `- ${code}`).join('\n')}

Total: ${baMinor.total_credits} credits`;
            }
        }

        const context = {
            courses: coursesWithPrereqs,
            minorInfo: minorInfo
        };

        // Generate AI response
        const response = await aiService.generateResponse(
            message,
            context,
            studentProfile || {}
        );

        res.json({
            success: true,
            data: {
                response,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        logger.error(`Chat error: ${error.message}`);
        next(error);
    }
};

// Get course recommendations
exports.recommendCourses = async (req, res, next) => {
    try {
        const { major, completedCourses, year, gpa } = req.body;

        const studentProfile = { major, year, gpa };
        
        const recommendations = await aiService.recommendCourses(
            studentProfile,
            completedCourses
        );

        res.json({
            success: true,
            data: { recommendations }
        });

    } catch (error) {
        next(error);
    }
};

// Plan semester
exports.planSemester = async (req, res, next) => {
    try {
        const { year, semester, completedCourses, major, preferences } = req.body;

        // Get available courses
        const allCourses = courseService.getAllCourses();
        const majorCourses = courseService.filterCoursesByMajor(allCourses, major);
        const availableCourses = courseService.filterByPrerequisites(
            majorCourses,
            completedCourses
        );

        // Create semester plan
        const plan = courseService.createSemesterPlan(
            availableCourses,
            major,
            preferences,
            year
        );

        res.json({
            success: true,
            data: plan
        });

    } catch (error) {
        next(error);
    }
};

// Get graduation timeline
exports.getGraduationTimeline = async (req, res, next) => {
    try {
        const { major, completedCourses, coursesPerSemester } = req.body;

        const timeline = courseService.calculateGraduationTimeline(
            major,
            completedCourses,
            coursesPerSemester || 5
        );

        res.json({
            success: true,
            data: timeline
        });

    } catch (error) {
        next(error);
    }
};

// Check prerequisites
exports.checkPrerequisites = async (req, res, next) => {
    try {
        const { courseId } = req.params;
        const { completedCourses } = req.query;

        const course = courseService.getCourseById(courseId);
        if (!course) {
            throw new NotFoundError('Course not found');
        }

        const prerequisites = courseService.getPrerequisites(courseId);
        const completed = completedCourses ? completedCourses.split(',').map(c => c.trim()) : [];
        
        const missingPrerequisites = courseService.getMissingPrerequisites(courseId, completed);

        res.json({
            success: true,
            data: {
                courseId,
                courseName: course.name,
                prerequisites,
                canTake: missingPrerequisites.length === 0,
                missingPrerequisites
            }
        });

    } catch (error) {
        next(error);
    }
};

// Get all courses
exports.getAllCourses = async (req, res, next) => {
    try {
        const { major } = req.query;
        
        let courses = courseService.getAllCourses();
        
        if (major) {
            courses = courseService.filterCoursesByMajor(courses, major);
        }

        res.json({
            success: true,
            data: { courses, total: courses.length }
        });

    } catch (error) {
        next(error);
    }
};

// Get course details
exports.getCourseDetails = async (req, res, next) => {
    try {
        const { courseId } = req.params;

        const course = courseService.getCourseById(courseId);
        if (!course) {
            throw new NotFoundError('Course not found');
        }

        const prerequisites = courseService.getPrerequisites(courseId);
        const relatedCourses = courseService.getRelatedCourses(courseId);

        res.json({
            success: true,
            data: {
                ...course,
                prerequisites,
                relatedCourses
            }
        });

    } catch (error) {
        next(error);
    }
};

// Get prerequisites
exports.getPrerequisites = async (req, res, next) => {
    try {
        const { courseId } = req.params;

        const course = courseService.getCourseById(courseId);
        if (!course) {
            throw new NotFoundError('Course not found');
        }

        const chain = courseService.getPrerequisiteChain(courseId);

        res.json({
            success: true,
            data: {
                courseId,
                courseName: course.name,
                ...chain
            }
        });

    } catch (error) {
        next(error);
    }
};