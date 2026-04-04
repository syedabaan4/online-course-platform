const prisma = require('../prisma');
const {
	checkCourseCompletion,
	generateCertificate,
} = require('./certificate.service');

async function runCompletionWatcher(studentId, courseId) {
	try {
		const result = await checkCourseCompletion(studentId, courseId);

		if (!result.completed) {
			return {
				triggered: false,
				reason: result.reason,
			};
		}

		const certificate = await generateCertificate(studentId, courseId);

		return {
			triggered: true,
			certificateId: certificate.certificateId,
		};
	} catch (error) {
		console.error('Completion watcher error:', error);
		return {
			triggered: false,
			reason: error.message,
		};
	}
}

module.exports = { runCompletionWatcher };
