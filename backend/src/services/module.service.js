const prisma = require('../prisma');

async function createModule(courseId, data, instructorId) {
	const course = await prisma.course.findUnique({
		where: { id: courseId },
		select: { instructorId: true },
	});

	if (!course || course.instructorId !== instructorId) {
		throw new Error('Unauthorized');
	}

	return prisma.module.create({
		data: {
			title: data.title,
			description: data.description,
			order: data.order,
			courseId,
		},
	});
}

async function getModulesByCourse(courseId) {
	return prisma.module.findMany({
		where: { courseId },
		orderBy: { order: 'asc' },
		include: {
			_count: {
				select: {
					lectures: true,
				},
			},
		},
	});
}

async function getModuleById(id) {
	const module = await prisma.module.findUnique({
		where: { id },
		include: {
			lectures: {
				orderBy: { order: 'asc' },
			},
		},
	});

	if (!module) {
		throw new Error('Module not found');
	}

	return module;
}

async function updateModule(id, data, instructorId) {
	const module = await prisma.module.findUnique({
		where: { id },
		select: { courseId: true },
	});

	if (!module) {
		throw new Error('Module not found');
	}

	const course = await prisma.course.findUnique({
		where: { id: module.courseId },
		select: { instructorId: true },
	});

	if (!course || course.instructorId !== instructorId) {
		throw new Error('Unauthorized');
	}

	return prisma.module.update({
		where: { id },
		data: {
			title: data.title,
			description: data.description,
			order: data.order,
		},
	});
}

async function deleteModule(id, instructorId) {
	const module = await prisma.module.findUnique({
		where: { id },
		select: { courseId: true },
	});

	if (!module) {
		throw new Error('Module not found');
	}

	const course = await prisma.course.findUnique({
		where: { id: module.courseId },
		select: { instructorId: true },
	});

	if (!course || course.instructorId !== instructorId) {
		throw new Error('Unauthorized');
	}

	await prisma.module.delete({
		where: { id },
	});

	return { message: 'Module deleted' };
}

module.exports = {
	createModule,
	getModulesByCourse,
	getModuleById,
	updateModule,
	deleteModule,
};
