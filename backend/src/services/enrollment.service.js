const prisma = require('../prisma');

async function enrollStudent(studentId, courseId) {
	const course = await prisma.course.findFirst({
		where: {
			id: courseId,
			status: 'PUBLISHED',
		},
		select: { id: true },
	});

	if (!course) {
		throw new Error('Course not found or not published');
	}

	const existingEnrollment = await prisma.enrollment.findUnique({
		where: {
			studentId_courseId: {
				studentId,
				courseId,
			},
		},
	});

	if (existingEnrollment) {
		throw new Error('Already enrolled in this course');
	}

	return prisma.enrollment.create({
		data: {
			studentId,
			courseId,
		},
	});
}

async function getStudentEnrollments(studentId) {
	const enrollments = await prisma.enrollment.findMany({
		where: { studentId },
		include: {
			course: {
				select: {
					id: true,
					title: true,
					description: true,
					thumbnailUrl: true,
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
			enrolledAt: 'desc',
		},
	});

	return Promise.all(
		enrollments.map(async (enrollment) => {
			const totalLectures = await prisma.lecture.count({
				where: {
					module: {
						courseId: enrollment.courseId,
					},
				},
			});

			const completedLectures = await prisma.lectureProgress.count({
				where: {
					studentId,
					isComplete: true,
					lecture: {
						module: {
							courseId: enrollment.courseId,
						},
					},
				},
			});

			const completionPercentage =
				totalLectures === 0
					? 0
					: Math.round((completedLectures / totalLectures) * 1000) / 10;

			return {
				...enrollment,
				totalLectures,
				completedLectures,
				completionPercentage,
			};
		})
	);
}

async function checkEnrollment(studentId, courseId) {
	return prisma.enrollment.findUnique({
		where: {
			studentId_courseId: {
				studentId,
				courseId,
			},
		},
	});
}

async function unenrollStudent(studentId, courseId) {
	const enrollment = await prisma.enrollment.findUnique({
		where: {
			studentId_courseId: {
				studentId,
				courseId,
			},
		},
	});

	if (!enrollment) {
		throw new Error('Not enrolled');
	}

	await prisma.enrollment.delete({
		where: {
			studentId_courseId: {
				studentId,
				courseId,
			},
		},
	});

	return { message: 'Unenrolled successfully' };
}

module.exports = {
	enrollStudent,
	getStudentEnrollments,
	checkEnrollment,
	unenrollStudent,
};
