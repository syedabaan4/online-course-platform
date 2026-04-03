const express = require('express');
const moduleService = require('../services/module.service');
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
		const { courseId, title, description, order } = req.body;

		if (!courseId || !title || order === undefined || order === null) {
			return res.status(400).json({
				error: 'courseId, title, and order are required',
			});
		}

		const module = await moduleService.createModule(
			parseInt(courseId, 10),
			{ title, description, order },
			req.user.id
		);

		return res.status(201).json({ data: module });
	} catch (error) {
		const statusCode = getStatusCode(error.message || '');
		return res.status(statusCode).json({ error: error.message });
	}
});

router.get('/course/:courseId', async (req, res) => {
	try {
		const courseId = parseInt(req.params.courseId, 10);
		const modules = await moduleService.getModulesByCourse(courseId);
		return res.status(200).json({ data: modules });
	} catch (error) {
		const statusCode = getStatusCode(error.message || '');
		return res.status(statusCode).json({ error: error.message });
	}
});

router.get('/:id', async (req, res) => {
	try {
		const id = parseInt(req.params.id, 10);
		const module = await moduleService.getModuleById(id);
		return res.status(200).json({ data: module });
	} catch (error) {
		const statusCode = getStatusCode(error.message || '');
		return res.status(statusCode).json({ error: error.message });
	}
});

router.put('/:id', authenticate, requireInstructor, async (req, res) => {
	try {
		const id = parseInt(req.params.id, 10);
		const module = await moduleService.updateModule(id, req.body, req.user.id);
		return res.status(200).json({ data: module });
	} catch (error) {
		const statusCode = getStatusCode(error.message || '');
		return res.status(statusCode).json({ error: error.message });
	}
});

router.delete('/:id', authenticate, requireInstructor, async (req, res) => {
	try {
		const id = parseInt(req.params.id, 10);
		const result = await moduleService.deleteModule(id, req.user.id);
		return res.status(200).json({ data: { message: result.message } });
	} catch (error) {
		const statusCode = getStatusCode(error.message || '');
		return res.status(statusCode).json({ error: error.message });
	}
});

module.exports = router;
