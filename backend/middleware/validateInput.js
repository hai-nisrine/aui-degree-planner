const { ValidationError } = require('./errorHandler');

// Validation middleware functions
const validateInput = {
    // Validate chat message endpoint
    chatMessage: (req, res, next) => {
        const { message, studentProfile } = req.body;

        if (!message || typeof message !== 'string') {
            throw new ValidationError('Message is required and must be a string');
        }

        if (message.trim().length === 0) {
            throw new ValidationError('Message cannot be empty');
        }

        if (message.length > 5000) {
            throw new ValidationError('Message cannot exceed 5000 characters');
        }

        // Optional student profile validation
        if (studentProfile) {
            if (studentProfile.major && typeof studentProfile.major !== 'string') {
                throw new ValidationError('Major must be a string');
            }

            if (studentProfile.completedCourses && !Array.isArray(studentProfile.completedCourses)) {
                throw new ValidationError('Completed courses must be an array');
            }

            if (studentProfile.year && typeof studentProfile.year !== 'number') {
                throw new ValidationError('Year must be a number');
            }
        }

        next();
    },

    // Validate course recommendation request
    recommendCourses: (req, res, next) => {
        const { major, completedCourses } = req.body;

        if (!major || typeof major !== 'string') {
            throw new ValidationError('Major is required and must be a string');
        }

        if (!Array.isArray(completedCourses)) {
            throw new ValidationError('Completed courses must be an array');
        }

        next();
    },

    // Validate semester planning request
    planSemester: (req, res, next) => {
        const { year, semester, completedCourses, major } = req.body;

        if (!year || typeof year !== 'number' || year < 1 || year > 4) {
            throw new ValidationError('Year must be a number between 1 and 4');
        }

        if (!semester || typeof semester !== 'number' || semester < 1 || semester > 2) {
            throw new ValidationError('Semester must be 1 or 2');
        }

        if (!Array.isArray(completedCourses)) {
            throw new ValidationError('Completed courses must be an array');
        }

        if (!major || typeof major !== 'string') {
            throw new ValidationError('Major is required');
        }

        next();
    },

    // Validate graduation timeline request
    graduationTimeline: (req, res, next) => {
        const { major, completedCourses } = req.body;

        if (!major || typeof major !== 'string') {
            throw new ValidationError('Major is required');
        }

        if (!Array.isArray(completedCourses)) {
            throw new ValidationError('Completed courses must be an array');
        }

        const coursesPerSemester = req.body.coursesPerSemester || 5;
        if (typeof coursesPerSemester !== 'number' || coursesPerSemester < 1) {
            throw new ValidationError('Courses per semester must be a positive number');
        }

        next();
    }
};

// Wrap validation middleware to handle async errors
const wrapValidation = (fn) => {
    return (req, res, next) => {
        try {
            fn(req, res, next);
        } catch (error) {
            next(error);
        }
    };
};

// Wrap all validators
Object.keys(validateInput).forEach(key => {
    validateInput[key] = wrapValidation(validateInput[key]);
});

module.exports = validateInput;