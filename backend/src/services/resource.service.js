const prisma = require('../prisma');

async function createResource(lectureId, data, instructorId) {
	const lecture = await prisma.lecture.findUnique({
		where: { id: lectureId },
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
		throw new Error('Module not found');
	}

	const course = await prisma.course.findUnique({
		where: { id: module.courseId },
		select: { instructorId: true },
	});

	if (!course) {
		throw new Error('Course not found');
	}

	if (course.instructorId !== instructorId) {
		throw new Error('Unauthorized');
	}

	return prisma.resource.create({
		data: {
			title: data.title,
			fileUrl: data.fileUrl,
			lectureId,
		},
	});
}

async function getResourcesByLecture(lectureId) {
	return prisma.resource.findMany({
		where: { lectureId },
		orderBy: { id: 'asc' },
	});
}

async function deleteResource(id, instructorId) {
	const resource = await prisma.resource.findUnique({
		where: { id },
		select: { lectureId: true },
	});

	if (!resource) {
		throw new Error('Resource not found');
	}

	const lecture = await prisma.lecture.findUnique({
		where: { id: resource.lectureId },
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
		throw new Error('Module not found');
	}

	const course = await prisma.course.findUnique({
		where: { id: module.courseId },
		select: { instructorId: true },
	});

	if (!course) {
		throw new Error('Course not found');
	}

	if (course.instructorId !== instructorId) {
		throw new Error('Unauthorized');
	}

	await prisma.resource.delete({
		where: { id },
	});

	return { message: 'Resource deleted' };
}

module.exports = {
	createResource,
	getResourcesByLecture,
	deleteResource,
};
