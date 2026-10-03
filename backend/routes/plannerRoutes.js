const express = require('express');
const router = express.Router();
const plannerController = require('../controllers/plannerController');
const authRequired = require('../middleware/auth');
const validateInput = require('../middleware/validateInput');

// Chat endpoint - no auth required
router.post('/chat', validateInput.chatMessage, plannerController.chat);

// Other routes with auth
router.post('/recommend-courses', authRequired, validateInput.recommendCourses, plannerController.recommendCourses);
router.post('/plan-semester', authRequired, validateInput.planSemester, plannerController.planSemester);
router.post('/graduation-timeline', authRequired, validateInput.graduationTimeline, plannerController.getGraduationTimeline);

router.get('/check-prerequisites/:courseId', authRequired, plannerController.checkPrerequisites);
router.get('/courses', plannerController.getAllCourses);
router.get('/courses/:courseId', authRequired, plannerController.getCourseDetails);
router.get('/prerequisites/:courseId', authRequired, plannerController.getPrerequisites);

module.exports = router;