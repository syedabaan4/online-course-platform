const express = require('express');
const quizService = require('../services/quiz.service');
const { authenticate, requireInstructor } = require('../middleware/auth.middleware');

const router = express.Router();

function getStatusCode(errorMessage) {
	if (errorMessage === 'Unauthorized') {
		return 403;
	}

	if (errorMessage && errorMessage.toLowerCase().includes('not found')) {
		return 404;
	}

	if (errorMessage === 'Quiz already exists for this module') {
		return 409;
	}

	return 400;
}

router.post('/', authenticate, requireInstructor, async (req, res) => {
	try {
		const { moduleId, title, passingScore } = req.body;

		if (!moduleId || !title || passingScore === undefined || passingScore === null) {
			return res.status(400).json({
				error: 'moduleId, title, and passingScore are required',
			});
		}

		const quiz = await quizService.createQuiz(
			parseInt(moduleId, 10),
			{
				title,
				passingScore: parseInt(passingScore, 10),
			},
			req.user.id
		);

		return res.status(201).json({ data: quiz });
	} catch (error) {
		const statusCode = getStatusCode(error.message || '');
		return res.status(statusCode).json({ error: error.message });
	}
});

router.get('/module/:moduleId', async (req, res) => {
	try {
		const quiz = await quizService.getQuizByModule(parseInt(req.params.moduleId, 10));
		return res.status(200).json({ data: quiz });
	} catch (error) {
		const statusCode = getStatusCode(error.message || '');
		return res.status(statusCode).json({ error: error.message });
	}
});

router.post('/:id/questions', authenticate, requireInstructor, async (req, res) => {
	try {
		const { text, options } = req.body;

		if (!text || !options) {
			return res.status(400).json({ error: 'text and options are required' });
		}

		const question = await quizService.addQuestion(
			parseInt(req.params.id, 10),
			{ text, options },
			req.user.id
		);

		return res.status(201).json({ data: question });
	} catch (error) {
		const statusCode = getStatusCode(error.message || '');
		return res.status(statusCode).json({ error: error.message });
	}
});

router.put('/questions/:questionId', authenticate, requireInstructor, async (req, res) => {
	try {
		const question = await quizService.updateQuestion(
			parseInt(req.params.questionId, 10),
			req.body,
			req.user.id
		);

		return res.status(200).json({ data: question });
	} catch (error) {
		const statusCode = getStatusCode(error.message || '');
		return res.status(statusCode).json({ error: error.message });
	}
});

router.delete('/questions/:questionId', authenticate, requireInstructor, async (req, res) => {
	try {
		const result = await quizService.deleteQuestion(
			parseInt(req.params.questionId, 10),
			req.user.id
		);

		return res.status(200).json({ data: { message: result.message } });
	} catch (error) {
		const statusCode = getStatusCode(error.message || '');
		return res.status(statusCode).json({ error: error.message });
	}
});

router.post('/:id/attempt', authenticate, async (req, res) => {
	try {
		const { answers } = req.body;

		if (!Array.isArray(answers)) {
			return res.status(400).json({ error: 'answers array is required' });
		}

		const result = await quizService.submitQuizAttempt(
			parseInt(req.params.id, 10),
			req.user.id,
			answers
		);

		return res.status(201).json({ data: result });
	} catch (error) {
		const statusCode = getStatusCode(error.message || '');
		return res.status(statusCode).json({ error: error.message });
	}
});

router.get('/:id/attempts/my', authenticate, async (req, res) => {
	try {
		const attempts = await quizService.getStudentAttemptsForQuiz(
			parseInt(req.params.id, 10),
			req.user.id
		);

		return res.status(200).json({ data: attempts });
	} catch (error) {
		const statusCode = getStatusCode(error.message || '');
		return res.status(statusCode).json({ error: error.message });
	}
});

router.post('/:id/publish', authenticate, requireInstructor, async (req, res) => {
	try {
		const quiz = await quizService.publishQuiz(parseInt(req.params.id, 10), req.user.id);
		return res.status(200).json({ data: quiz });
	} catch (error) {
		const statusCode = getStatusCode(error.message || '');
		return res.status(statusCode).json({ error: error.message });
	}
});

router.get('/:id', async (req, res) => {
	try {
		const quiz = await quizService.getQuizById(parseInt(req.params.id, 10));
		return res.status(200).json({ data: quiz });
	} catch (error) {
		const statusCode = getStatusCode(error.message || '');
		return res.status(statusCode).json({ error: error.message });
	}
});

router.put('/:id', authenticate, requireInstructor, async (req, res) => {
	try {
		const quiz = await quizService.updateQuiz(
			parseInt(req.params.id, 10),
			req.body,
			req.user.id
		);

		return res.status(200).json({ data: quiz });
	} catch (error) {
		const statusCode = getStatusCode(error.message || '');
		return res.status(statusCode).json({ error: error.message });
	}
});

router.delete('/:id', authenticate, requireInstructor, async (req, res) => {
	try {
		const result = await quizService.deleteQuiz(parseInt(req.params.id, 10), req.user.id);
		return res.status(200).json({ data: { message: result.message } });
	} catch (error) {
		const statusCode = getStatusCode(error.message || '');
		return res.status(statusCode).json({ error: error.message });
	}
});

module.exports = router;
