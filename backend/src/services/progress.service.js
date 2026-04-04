const prisma = require('../prisma');

async function markLectureComplete(studentId, lectureId, isComplete = true) {
	return prisma.lectureProgress.upsert({
		where: {
			studentId_lectureId: {
				studentId,
				lectureId,
			},
		},
		update: {
			isComplete,
		},
		create: {
			studentId,
			lectureId,
			isComplete,
		},
	});
}

async function getCourseProgress(studentId, courseId) {
	const course = await prisma.course.findUnique({
		where: { id: courseId },
		include: {
			modules: {
				include: {
					lectures: {
						select: { id: true },
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

	const completedProgress = await prisma.lectureProgress.findMany({
		where: {
			studentId,
			isComplete: true,
			lectureId: {
				in: lectureIds,
			},
		},
		select: {
			lectureId: true,
		},
	});

	const completedLectureIds = completedProgress.map((item) => item.lectureId);
	const completedLectures = completedLectureIds.length;
	const percentage =
		totalLectures === 0
			? 0
			: Math.round((completedLectures / totalLectures) * 1000) / 10;

	return {
		totalLectures,
		completedLectures,
		percentage,
		completedLectureIds,
	};
}

async function getNextIncompleteLecture(studentId, courseId) {
	const course = await prisma.course.findUnique({
		where: { id: courseId },
		include: {
			modules: {
				orderBy: { order: 'asc' },
				include: {
					lectures: {
						orderBy: { order: 'asc' },
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

	const completedProgress = await prisma.lectureProgress.findMany({
		where: {
			studentId,
			isComplete: true,
			lectureId: {
				in: lectureIds,
			},
		},
		select: {
			lectureId: true,
		},
	});

	const completedLectureIds = new Set(
		completedProgress.map((progress) => progress.lectureId)
	);

	for (const module of course.modules) {
		for (const lecture of module.lectures) {
			if (!completedLectureIds.has(lecture.id)) {
				return lecture;
			}
		}
	}

	return null;
}

async function getLectureProgressForCourse(studentId, courseId) {
	const course = await prisma.course.findUnique({
		where: { id: courseId },
		include: {
			modules: {
				orderBy: { order: 'asc' },
				include: {
					lectures: {
						orderBy: { order: 'asc' },
						select: { id: true },
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

	const progressRecords = await prisma.lectureProgress.findMany({
		where: {
			studentId,
			lectureId: {
				in: lectureIds,
			},
		},
		select: {
			lectureId: true,
			isComplete: true,
		},
	});

	const progressMap = new Map(
		progressRecords.map((record) => [record.lectureId, record.isComplete])
	);

	return lectureIds.map((lectureId) => ({
		lectureId,
		isComplete: progressMap.get(lectureId) || false,
	}));
}

module.exports = {
	markLectureComplete,
	getCourseProgress,
	getNextIncompleteLecture,
	getLectureProgressForCourse,
};
