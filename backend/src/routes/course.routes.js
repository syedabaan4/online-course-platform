const express = require('express');
const courseService = require('../services/course.service');
const { authenticate, requireInstructor } = require('../middleware/auth.middleware');

const router = express.Router();

function mapErrorToStatus(errorMessage) {
	if (errorMessage === 'Unauthorized') {
		return 403;
	}

	if (errorMessage.toLowerCase().includes('not found')) {
		return 404;
	}

	return 400;
}

router.get('/', async (req, res) => {
	try {
		const { search, category, difficulty } = req.query;
		const courses = await courseService.getAllPublishedCourses({
			search,
			category,
			difficulty,
		});

		return res.status(200).json({ data: courses });
	} catch (error) {
		return res.status(500).json({ error: 'Internal server error' });
	}
});

router.get('/my', authenticate, requireInstructor, async (req, res) => {
	try {
		const courses = await courseService.getInstructorCourses(req.user.id);
		return res.status(200).json({ data: courses });
	} catch (error) {
		return res.status(500).json({ error: 'Internal server error' });
	}
});

router.get('/:id', async (req, res) => {
	try {
		const id = parseInt(req.params.id, 10);
		const course = await courseService.getCourseById(id);
		return res.status(200).json({ data: course });
	} catch (error) {
		const status = mapErrorToStatus(error.message || '');
		return res.status(status).json({ error: error.message });
	}
});

router.post('/', authenticate, requireInstructor, async (req, res) => {
	try {
		const { title, description, category, difficulty } = req.body;

		if (!title || !description || !category || !difficulty) {
			return res.status(400).json({
				error: 'title, description, category, and difficulty are required',
			});
		}

		const course = await courseService.createCourse(req.body, req.user.id);
		return res.status(201).json({ data: course });
	} catch (error) {
		const status = mapErrorToStatus(error.message || '');
		return res.status(status).json({ error: error.message });
	}
});

router.put('/:id', authenticate, requireInstructor, async (req, res) => {
	try {
		const id = parseInt(req.params.id, 10);
		const course = await courseService.updateCourse(id, req.body, req.user.id);
		return res.status(200).json({ data: course });
	} catch (error) {
		const status = mapErrorToStatus(error.message || '');
		return res.status(status).json({ error: error.message });
	}
});

router.delete('/:id', authenticate, requireInstructor, async (req, res) => {
	try {
		const id = parseInt(req.params.id, 10);
		const result = await courseService.deleteCourse(id, req.user.id);
		return res.status(200).json({ data: { message: result.message } });
	} catch (error) {
		const status = mapErrorToStatus(error.message || '');
		return res.status(status).json({ error: error.message });
	}
});

router.put('/:id/publish', authenticate, requireInstructor, async (req, res) => {
	try {
		const id = parseInt(req.params.id, 10);
		const course = await courseService.publishCourse(id, req.user.id);
		return res.status(200).json({ data: course });
	} catch (error) {
		const status = mapErrorToStatus(error.message || '');
		return res.status(status).json({ error: error.message });
	}
});

module.exports = router;
