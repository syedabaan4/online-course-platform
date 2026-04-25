const prisma = require('../prisma');

async function checkCourseCompletion(studentId, courseId) {
	const course = await prisma.course.findUnique({
		where: { id: courseId },
		include: {
			modules: {
				include: {
					lectures: {
						select: { id: true },
					},
					quiz: {
						select: { id: true, isPublished: true },
					},
				},
			},
		},
	});

	if (!course) {
		throw new Error('Course not found');
	}

	const lectureIds = course.modules.flatMap((module) =>
		module.lectures.map((lecture) => lecture.id)
	);

	const totalLectures = lectureIds.length;
	const completedLectures = await prisma.lectureProgress.count({
		where: {
			studentId,
			isComplete: true,
			lectureId: {
				in: lectureIds,
			},
		},
	});

	if (completedLectures < totalLectures) {
		return { completed: false, reason: 'Not all lectures completed' };
	}

	const quizIds = course.modules
		.filter((module) => module.quiz?.isPublished)
		.map((module) => module.quiz.id);

	if (quizIds.length > 0) {
		const passedAttempts = await prisma.quizAttempt.findMany({
			where: {
				studentId,
				passed: true,
				quizId: {
					in: quizIds,
				},
			},
			select: {
				quizId: true,
			},
			distinct: ['quizId'],
		});

		if (passedAttempts.length < quizIds.length) {
			return { completed: false, reason: 'Not all quizzes passed' };
		}
	}

	return { completed: true };
}

function buildCertificateId(studentId, courseId) {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	return `CERT-${year}${month}-U${studentId}-C${courseId}`;
}

async function generateCertificate(studentId, courseId) {
	const completion = await checkCourseCompletion(studentId, courseId);

	if (!completion.completed) {
		throw new Error(completion.reason);
	}

	const existingCertificate = await prisma.certificate.findUnique({
		where: {
			studentId_courseId: {
				studentId,
				courseId,
			},
		},
		include: {
			student: {
				select: { name: true },
			},
			course: {
				select: { title: true },
			},
		},
	});

	if (existingCertificate) {
		return existingCertificate;
	}

	const certificateId = buildCertificateId(studentId, courseId);

	return prisma.certificate.create({
		data: {
			certificateId,
			studentId,
			courseId,
		},
		include: {
			student: {
				select: { name: true },
			},
			course: {
				select: { title: true },
			},
		},
	});
}

async function getStudentCertificates(studentId) {
	return prisma.certificate.findMany({
		where: { studentId },
		include: {
			course: {
				select: {
					title: true,
					category: true,
					instructor: {
						select: {
							name: true,
						},
					},
				},
			},
		},
		orderBy: {
			issuedAt: 'desc',
		},
	});
}

async function getCertificateById(certificateId) {
	const certificate = await prisma.certificate.findUnique({
		where: { certificateId },
		include: {
			course: {
				select: {
					title: true,
					instructor: {
						select: {
							name: true,
						},
					},
				},
			},
			student: {
				select: {
					name: true,
				},
			},
		},
	});

	if (!certificate) {
		throw new Error('Certificate not found');
	}

	return certificate;
}

module.exports = {
	checkCourseCompletion,
	generateCertificate,
	getStudentCertificates,
	getCertificateById,
};
