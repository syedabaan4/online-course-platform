const prisma = require('../prisma');
const { runCompletionWatcher } = require('./completion.watcher');


function validateOptions(options) {
	if (!Array.isArray(options) || options.length < 2 || options.length > 4) {
		return false;
	}

	const correctCount = options.filter((option) => option.isCorrect === true).length;
	return correctCount === 1;
}

async function verifyCourseOwnershipByModule(moduleId, instructorId) {
	const module = await prisma.module.findUnique({
		where: { id: moduleId },
		select: { courseId: true },
	});

	if (!module) {
		throw new Error('Unauthorized');
	}

	const course = await prisma.course.findUnique({
		where: { id: module.courseId },
		select: { instructorId: true },
	});

	if (!course || course.instructorId !== instructorId) {
		throw new Error('Unauthorized');
	}
}

async function createQuiz(moduleId, data, instructorId) {
	await verifyCourseOwnershipByModule(moduleId, instructorId);

	const existingQuiz = await prisma.quiz.findUnique({
		where: { moduleId },
		select: { id: true },
	});

	if (existingQuiz) {
		throw new Error('Quiz already exists for this module');
	}

	return prisma.quiz.create({
		data: {
			title: data.title,
			passingScore: data.passingScore,
			moduleId,
		},
	});
}

async function getQuizById(id) {
	const quiz = await prisma.quiz.findUnique({
		where: { id },
		include: {
			questions: {
				include: {
					options: true,
				},
			},
		},
	});

	if (!quiz) {
		throw new Error('Quiz not found');
	}

	return quiz;
}

async function getQuizByModule(moduleId) {
	return prisma.quiz.findUnique({
		where: { moduleId },
		include: {
			questions: {
				include: {
					options: true,
				},
			},
		},
	});
}

async function updateQuiz(id, data, instructorId) {
	const quiz = await prisma.quiz.findUnique({
		where: { id },
		select: { moduleId: true },
	});

	if (!quiz) {
		throw new Error('Unauthorized');
	}

	await verifyCourseOwnershipByModule(quiz.moduleId, instructorId);

	return prisma.quiz.update({
		where: { id },
		data: {
			title: data.title,
			passingScore: data.passingScore,
		},
	});
}

async function deleteQuiz(id, instructorId) {
	const quiz = await prisma.quiz.findUnique({
		where: { id },
		select: { moduleId: true },
	});

	if (!quiz) {
		throw new Error('Unauthorized');
	}

	await verifyCourseOwnershipByModule(quiz.moduleId, instructorId);

	await prisma.quiz.delete({
		where: { id },
	});

	return { message: 'Quiz deleted' };
}

async function addQuestion(quizId, data, instructorId) {
	const quiz = await prisma.quiz.findUnique({
		where: { id: quizId },
		select: { moduleId: true },
	});

	if (!quiz) {
		throw new Error('Unauthorized');
	}

	await verifyCourseOwnershipByModule(quiz.moduleId, instructorId);

	if (!validateOptions(data.options)) {
		throw new Error('Must have 2-4 options with exactly one correct');
	}

	return prisma.question.create({
		data: {
			text: data.text,
			quizId,
			options: {
				create: data.options.map((option) => ({
					text: option.text,
					isCorrect: option.isCorrect,
				})),
			},
		},
		include: {
			options: true,
		},
	});
}

async function updateQuestion(questionId, data, instructorId) {
	const question = await prisma.question.findUnique({
		where: { id: questionId },
		select: {
			quiz: {
				select: { moduleId: true },
			},
		},
	});

	if (!question || !question.quiz) {
		throw new Error('Unauthorized');
	}

	await verifyCourseOwnershipByModule(question.quiz.moduleId, instructorId);

	if (data.options !== undefined && !validateOptions(data.options)) {
		throw new Error('Must have 2-4 options with exactly one correct');
	}

	await prisma.$transaction(async (tx) => {
		if (data.text !== undefined) {
			await tx.question.update({
				where: { id: questionId },
				data: { text: data.text },
			});
		}

		if (data.options !== undefined) {
			await tx.answerOption.deleteMany({
				where: { questionId },
			});

			await tx.answerOption.createMany({
				data: data.options.map((option) => ({
					text: option.text,
					isCorrect: option.isCorrect,
					questionId,
				})),
			});
		}
	});

	return prisma.question.findUnique({
		where: { id: questionId },
		include: {
			options: true,
		},
	});
}

async function deleteQuestion(questionId, instructorId) {
	const question = await prisma.question.findUnique({
		where: { id: questionId },
		select: {
			quiz: {
				select: { moduleId: true },
			},
		},
	});

	if (!question || !question.quiz) {
		throw new Error('Unauthorized');
	}

	await verifyCourseOwnershipByModule(question.quiz.moduleId, instructorId);

	await prisma.question.delete({
		where: { id: questionId },
	});

	return { message: 'Question deleted' };
}

async function submitQuizAttempt(quizId, studentId, answers) {
	const quiz = await prisma.quiz.findUnique({
		where: { id: quizId },
		select: {
			id: true,
			passingScore: true,
			questions: {
				select: {
					id: true,
					text: true,
					options: {
						select: {
							id: true,
							isCorrect: true,
						},
					},
				},
			},
		},
	});

	if (!quiz) {
		throw new Error('Quiz not found');
	}

	if (!Array.isArray(answers) || answers.length !== quiz.questions.length) {
		throw new Error('Must answer all questions');
	}

	const optionMap = new Map();
	for (const question of quiz.questions) {
		for (const option of question.options) {
			optionMap.set(option.id, {
				questionId: question.id,
				isCorrect: option.isCorrect,
			});
		}
	}

	let correctCount = 0;
	for (const answer of answers) {
		const selectedOption = optionMap.get(answer.selectedOptionId);

		if (!selectedOption || selectedOption.questionId !== answer.questionId) {
			continue;
		}

		if (selectedOption.isCorrect) {
			correctCount += 1;
		}
	}

	const totalQuestions = quiz.questions.length;
	const score = totalQuestions === 0 ? 0 : (correctCount / totalQuestions) * 100;
	const passed = score >= quiz.passingScore;

	const attempt = await prisma.quizAttempt.create({
		data: {
			quizId,
			studentId,
			score,
			passed,
			answers: {
				create: answers.map((answer) => ({
					questionId: answer.questionId,
					selectedOptionId: answer.selectedOptionId,
				})),
			},
		},
		include: {
			answers: true,
		},
	});

	const answerMap = new Map(answers.map((answer) => [answer.questionId, answer]));

	const breakdown = quiz.questions.map((question) => {
		const selectedAnswer = answerMap.get(question.id);
		const correctOption = question.options.find((option) => option.isCorrect);
		const selectedOption = question.options.find(
			(option) => option.id === selectedAnswer?.selectedOptionId
		);

		return {
			questionId: question.id,
			questionText: question.text,
			selectedOptionId: selectedAnswer?.selectedOptionId || null,
			correctOptionId: correctOption ? correctOption.id : null,
			isCorrect: selectedOption ? selectedOption.isCorrect : false,
		};
	});

    let completionStatus = null;
    if (passed) {

    const quizWithModule = await prisma.quiz.findUnique({
        where: { id: quizId },
        include: { module: { select: { courseId: true } } }
    });
    if (quizWithModule?.module?.courseId) {
        completionStatus = await runCompletionWatcher(studentId, quizWithModule.module.courseId);
    }
    }

	return {
		score,
		passed,
		correctCount,
		totalQuestions,
		attempt,
		breakdown,
        completionStatus
	};
}

async function getStudentAttemptsForQuiz(quizId, studentId) {
	return prisma.quizAttempt.findMany({
		where: {
			quizId,
			studentId,
		},
		orderBy: {
			createdAt: 'desc',
		},
		include: {
			answers: true,
		},
	});
}

async function getLatestAttempt(quizId, studentId) {
	return prisma.quizAttempt.findFirst({
		where: {
			quizId,
			studentId,
		},
		orderBy: {
			createdAt: 'desc',
		},
		include: {
			answers: true,
		},
	});
}

module.exports = {
	createQuiz,
	getQuizById,
	getQuizByModule,
	updateQuiz,
	deleteQuiz,
	addQuestion,
	updateQuestion,
	deleteQuestion,
	submitQuizAttempt,
	getStudentAttemptsForQuiz,
	getLatestAttempt,
};
