const express = require('express');
const enrollmentService = require('../services/enrollment.service');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/', authenticate, async (req, res) => {
	try {
		const { courseId } = req.body;

		if (!courseId) {
			return res.status(400).json({ error: 'courseId is required' });
		}

		const enrollment = await enrollmentService.enrollStudent(
			req.user.id,
			parseInt(courseId, 10)
		);

		return res.status(201).json({ data: enrollment });
	} catch (error) {
		if (error.message === 'Already enrolled in this course') {
			return res.status(409).json({ error: error.message });
		}

		return res.status(400).json({ error: error.message });
	}
});

router.get('/my', authenticate, async (req, res) => {
	try {
		const enrollments = await enrollmentService.getStudentEnrollments(req.user.id);
		return res.status(200).json({ data: enrollments });
	} catch (error) {
		return res.status(400).json({ error: error.message });
	}
});

router.get('/check/:courseId', authenticate, async (req, res) => {
	try {
		const courseId = parseInt(req.params.courseId, 10);
		const enrollment = await enrollmentService.checkEnrollment(req.user.id, courseId);

		return res.status(200).json({
			data: { enrolled: !!enrollment },
		});
	} catch (error) {
		return res.status(400).json({ error: error.message });
	}
});

router.delete('/:courseId', authenticate, async (req, res) => {
	try {
		const courseId = parseInt(req.params.courseId, 10);
		const result = await enrollmentService.unenrollStudent(req.user.id, courseId);
		return res.status(200).json({ data: { message: result.message } });
	} catch (error) {
		return res.status(400).json({ error: error.message });
	}
});

module.exports = router;
