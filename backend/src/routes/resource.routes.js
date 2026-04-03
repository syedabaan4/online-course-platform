const express = require('express');
const resourceService = require('../services/resource.service');
const { authenticate, requireInstructor } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

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

router.post('/', authenticate, requireInstructor, upload.single('file'), async (req, res) => {
	try {
		const { lectureId, title } = req.body;

		if (!lectureId || !title || !req.file) {
			return res.status(400).json({
				error: 'lectureId, title, and file are required',
			});
		}

		const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

		const resource = await resourceService.createResource(
			parseInt(lectureId, 10),
			{ title, fileUrl },
			req.user.id
		);

		return res.status(201).json({ data: resource });
	} catch (error) {
		const statusCode = getStatusCode(error.message || '');
		return res.status(statusCode).json({ error: error.message });
	}
});

router.get('/lecture/:lectureId', async (req, res) => {
	try {
		const lectureId = parseInt(req.params.lectureId, 10);
		const resources = await resourceService.getResourcesByLecture(lectureId);
		return res.status(200).json({ data: resources });
	} catch (error) {
		const statusCode = getStatusCode(error.message || '');
		return res.status(statusCode).json({ error: error.message });
	}
});

router.delete('/:id', authenticate, requireInstructor, async (req, res) => {
	try {
		const id = parseInt(req.params.id, 10);
		const result = await resourceService.deleteResource(id, req.user.id);
		return res.status(200).json({ data: { message: result.message } });
	} catch (error) {
		const statusCode = getStatusCode(error.message || '');
		return res.status(statusCode).json({ error: error.message });
	}
});

module.exports = router;
