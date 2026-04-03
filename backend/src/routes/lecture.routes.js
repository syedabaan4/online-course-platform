const express = require('express');
const lectureService = require('../services/lecture.service');
const { authenticate, requireInstructor } = require('../middleware/auth.middleware');

const router = express.Router();

function getStatusCode(errorMessage) {
	if (errorMessage === 'Unauthorized') {
		return 403;
	}

	if (errorMessage && errorMessage.toLowerCase().includes('not found')) {
		return 404;
	}

	return 400;
}

router.post('/', authenticate, requireInstructor, async (req, res) => {
	try {
		const { moduleId, title, description, videoUrl, order } = req.body;

		if (!moduleId || !title || !videoUrl || order === undefined || order === null) {
			return res.status(400).json({
				error: 'moduleId, title, videoUrl, and order are required',
			});
		}

		const lecture = await lectureService.createLecture(
			parseInt(moduleId, 10),
			{ title, description, videoUrl, order },
			req.user.id
		);

		return res.status(201).json({ data: lecture });
	} catch (error) {
		const statusCode = getStatusCode(error.message || '');
		return res.status(statusCode).json({ error: error.message });
	}
});

router.get('/module/:moduleId', async (req, res) => {
	try {
		const moduleId = parseInt(req.params.moduleId, 10);
		const lectures = await lectureService.getLecturesByModule(moduleId);
		return res.status(200).json({ data: lectures });
	} catch (error) {
		const statusCode = getStatusCode(error.message || '');
		return res.status(statusCode).json({ error: error.message });
	}
});

router.get('/:id', async (req, res) => {
	try {
		const id = parseInt(req.params.id, 10);
		const lecture = await lectureService.getLectureById(id);
		return res.status(200).json({ data: lecture });
	} catch (error) {
		const statusCode = getStatusCode(error.message || '');
		return res.status(statusCode).json({ error: error.message });
	}
});

router.put('/:id', authenticate, requireInstructor, async (req, res) => {
	try {
		const id = parseInt(req.params.id, 10);
		const lecture = await lectureService.updateLecture(id, req.body, req.user.id);
		return res.status(200).json({ data: lecture });
	} catch (error) {
		const statusCode = getStatusCode(error.message || '');
		return res.status(statusCode).json({ error: error.message });
	}
});

router.delete('/:id', authenticate, requireInstructor, async (req, res) => {
	try {
		const id = parseInt(req.params.id, 10);
		const result = await lectureService.deleteLecture(id, req.user.id);
		return res.status(200).json({ data: { message: result.message } });
	} catch (error) {
		const statusCode = getStatusCode(error.message || '');
		return res.status(statusCode).json({ error: error.message });
	}
});

module.exports = router;
