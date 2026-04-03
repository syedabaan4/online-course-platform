const prisma = require('../prisma');

async function createLecture(moduleId, data, instructorId) {
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

	return prisma.lecture.create({
		data: {
			title: data.title,
			description: data.description,
			videoUrl: data.videoUrl,
			order: data.order,
			moduleId,
		},
	});
}

async function getLecturesByModule(moduleId) {
	return prisma.lecture.findMany({
		where: { moduleId },
		orderBy: { order: 'asc' },
		include: {
			_count: {
				select: {
					resources: true,
				},
			},
		},
	});
}

async function getLectureById(id) {
	const lecture = await prisma.lecture.findUnique({
		where: { id },
		include: {
			resources: true,
		},
	});

	if (!lecture) {
		throw new Error('Lecture not found');
	}

	return lecture;
}

async function updateLecture(id, data, instructorId) {
	const lecture = await prisma.lecture.findUnique({
		where: { id },
		select: { moduleId: true },
	});

	if (!lecture) {
		throw new Error('Lecture not found');
	}

	const module = await prisma.module.findUnique({
		where: { id: lecture.moduleId },
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

	return prisma.lecture.update({
		where: { id },
		data: {
			title: data.title,
			description: data.description,
			videoUrl: data.videoUrl,
			order: data.order,
		},
	});
}

async function deleteLecture(id, instructorId) {
	const lecture = await prisma.lecture.findUnique({
		where: { id },
		select: { moduleId: true },
	});

	if (!lecture) {
		throw new Error('Lecture not found');
	}

	const module = await prisma.module.findUnique({
		where: { id: lecture.moduleId },
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

	await prisma.lecture.delete({
		where: { id },
	});

	return { message: 'Lecture deleted' };
}

module.exports = {
	createLecture,
	getLecturesByModule,
	getLectureById,
	updateLecture,
	deleteLecture,
};
