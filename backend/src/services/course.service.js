const prisma = require('../prisma');

async function createCourse(data, instructorId) {
	return prisma.course.create({
		data: {
			title: data.title,
			description: data.description,
			category: data.category,
			difficulty: data.difficulty,
			thumbnailUrl: data.thumbnailUrl,
			status: 'DRAFT',
			instructorId,
		},
	});
}

async function getInstructorCourses(instructorId) {
	return prisma.course.findMany({
		where: { instructorId },
		include: {
			_count: {
				select: {
					enrollments: true,
					modules: true,
				},
			},
		},
		orderBy: {
			createdAt: 'desc',
		},
	});
}

async function getCourseById(id) {
	const course = await prisma.course.findUnique({
		where: { id },
		include: {
			instructor: {
				select: {
					name: true,
				},
			},
			modules: {
				orderBy: {
					order: 'asc',
				},
				include: {
					lectures: {
						orderBy: {
							order: 'asc',
						},
					},
				},
			},
		},
	});

	if (!course) {
		throw new Error('Course not found');
	}

	return course;
}

async function updateCourse(id, data, instructorId) {
	const existingCourse = await prisma.course.findUnique({
		where: { id },
		select: {
			instructorId: true,
		},
	});

	if (!existingCourse || existingCourse.instructorId !== instructorId) {
		throw new Error('Unauthorized');
	}

	return prisma.course.update({
		where: { id },
		data: {
			title: data.title,
			description: data.description,
			category: data.category,
			difficulty: data.difficulty,
			thumbnailUrl: data.thumbnailUrl,
		},
	});
}

async function deleteCourse(id, instructorId) {
	const existingCourse = await prisma.course.findUnique({
		where: { id },
		select: {
			instructorId: true,
		},
	});

	if (!existingCourse || existingCourse.instructorId !== instructorId) {
		throw new Error('Unauthorized');
	}

	await prisma.course.delete({
		where: { id },
	});

	return { message: 'Course deleted' };
}

async function publishCourse(id, instructorId) {
	const course = await prisma.course.findUnique({
		where: { id },
		include: {
			modules: {
				include: {
					lectures: true,
				},
			},
		},
	});

	if (!course || course.instructorId !== instructorId) {
		throw new Error('Unauthorized');
	}

	if (course.modules.length === 0) {
		throw new Error('Course must have at least one module');
	}

	const hasModuleWithoutLectures = course.modules.some(
		(module) => module.lectures.length === 0
	);

	if (hasModuleWithoutLectures) {
		throw new Error('All modules must have at least one lecture');
	}

	return prisma.course.update({
		where: { id },
		data: {
			status: 'PUBLISHED',
		},
	});
}

async function getAllPublishedCourses(filters = {}) {
	const where = {
		status: 'PUBLISHED',
	};

	if (filters.search) {
		where.title = {
			contains: filters.search,
			mode: 'insensitive',
		};
	}

	if (filters.category) {
		where.category = filters.category;
	}

	if (filters.difficulty) {
		where.difficulty = filters.difficulty;
	}

	return prisma.course.findMany({
		where,
		include: {
			instructor: {
				select: {
					name: true,
				},
			},
			_count: {
				select: {
					modules: true,
				},
			},
		},
		orderBy: {
			createdAt: 'desc',
		},
	});
}

module.exports = {
	createCourse,
	getInstructorCourses,
	getCourseById,
	updateCourse,
	deleteCourse,
	publishCourse,
	getAllPublishedCourses,
};
