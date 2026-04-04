const express = require('express');
const progressService = require('../services/progress.service');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/', authenticate, async (req, res) => {
	try {
		const { lectureId, isComplete = true } = req.body;

		if (!lectureId) {
			return res.status(400).json({ error: 'lectureId is required' });
		}

		const progress = await progressService.markLectureComplete(
			req.user.id,
			parseInt(lectureId, 10),
			isComplete
		);

		return res.status(200).json({ data: progress });
	} catch (error) {
		return res.status(400).json({ error: error.message });
	}
});

router.get('/course/:courseId', authenticate, async (req, res) => {
	try {
		const courseId = parseInt(req.params.courseId, 10);
		const progressSummary = await progressService.getCourseProgress(req.user.id, courseId);
		return res.status(200).json({ data: progressSummary });
	} catch (error) {
		return res.status(400).json({ error: error.message });
	}
});

router.get('/course/:courseId/details', authenticate, async (req, res) => {
	try {
		const courseId = parseInt(req.params.courseId, 10);
		const lectureProgressArray = await progressService.getLectureProgressForCourse(
			req.user.id,
			courseId
		);

		return res.status(200).json({ data: lectureProgressArray });
	} catch (error) {
		return res.status(400).json({ error: error.message });
	}
});

router.get('/course/:courseId/next', authenticate, async (req, res) => {
	try {
		const courseId = parseInt(req.params.courseId, 10);
		const lecture = await progressService.getNextIncompleteLecture(req.user.id, courseId);
		return res.status(200).json({ data: { lecture } });
	} catch (error) {
		return res.status(400).json({ error: error.message });
	}
});

router.put('/:lectureId', authenticate, async (req, res) => {
	try {
		const lectureId = parseInt(req.params.lectureId, 10);
		const { isComplete } = req.body;

		const progress = await progressService.markLectureComplete(
			req.user.id,
			lectureId,
			isComplete
		);

		return res.status(200).json({ data: progress });
	} catch (error) {
		return res.status(400).json({ error: error.message });
	}
});

module.exports = router;
