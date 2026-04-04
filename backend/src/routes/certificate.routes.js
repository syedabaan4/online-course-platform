const express = require('express');
const certificateService = require('../services/certificate.service');
const { generateCertificatePDF } = require('../services/certificate.pdf.js');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/generate', authenticate, async (req, res) => {
	try {
		const { courseId } = req.body;

		if (!courseId) {
			return res.status(400).json({ error: 'courseId is required' });
		}

		const certificate = await certificateService.generateCertificate(
			req.user.id,
			parseInt(courseId, 10)
		);

		return res.status(201).json({ data: certificate });
	} catch (error) {
		return res.status(400).json({ error: error.message });
	}
});

router.get('/my', authenticate, async (req, res) => {
	try {
		const certificates = await certificateService.getStudentCertificates(req.user.id);
		return res.status(200).json({ data: certificates });
	} catch (error) {
		return res.status(400).json({ error: error.message });
	}
});

router.get('/check/:courseId', authenticate, async (req, res) => {
	try {
		const completion = await certificateService.checkCourseCompletion(
			req.user.id,
			parseInt(req.params.courseId, 10)
		);

		return res.status(200).json({
			data: {
				completed: completion.completed,
				reason: completion.reason,
			},
		});
	} catch (error) {
		return res.status(400).json({ error: error.message });
	}
});

router.get('/:certificateId', async (req, res) => {
	try {
		const certificate = await certificateService.getCertificateById(req.params.certificateId);
		return res.status(200).json({ data: certificate });
	} catch (error) {
		if (error.message === 'Certificate not found') {
			return res.status(404).json({ error: error.message });
		}

		return res.status(400).json({ error: error.message });
	}
});

router.get('/:certificateId/download', async (req, res) => {
  try {
		const cert = await certificateService.getCertificateById(req.params.certificateId);
    const certificateData = {
      certificateId: cert.certificateId,
      studentName: cert.student.name,
      courseName: cert.course.title,
      instructorName: cert.course.instructor.name,
      issuedAt: new Date(cert.issuedAt)
    };
    generateCertificatePDF(certificateData, res);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

module.exports = router;
