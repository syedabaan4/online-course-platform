const PDFDocument = require('pdfkit');

function generateCertificatePDF(certificateData, res) {
	const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 50 });

	res.setHeader('Content-Type', 'application/pdf');
	res.setHeader(
		'Content-Disposition',
		`attachment; filename="certificate-${certificateData.certificateId}.pdf"`
	);

	doc.pipe(res);

	doc.rect(0, 0, doc.page.width, doc.page.height).fill('#FFFDF0');

	doc.lineWidth(3);
	doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).stroke('#C9A84C');

	doc
		.font('Helvetica-Bold')
		.fontSize(28)
		.fillColor('#1A1A2E')
		.text('CERTIFICATE OF COMPLETION', 0, 80, { align: 'center', width: doc.page.width });

	doc
		.font('Helvetica')
		.fontSize(16)
		.fillColor('#555555')
		.text('This certifies that', 0, 140, { align: 'center', width: doc.page.width });

	doc
		.font('Helvetica-Bold')
		.fontSize(36)
		.fillColor('#1A1A2E')
		.text(certificateData.studentName, 0, 170, { align: 'center', width: doc.page.width });

	doc
		.font('Helvetica')
		.fontSize(16)
		.fillColor('#555555')
		.text('has successfully completed the course', 0, 225, {
			align: 'center',
			width: doc.page.width,
		});

	doc
		.font('Helvetica-Bold')
		.fontSize(24)
		.fillColor('#C9A84C')
		.text(certificateData.courseName, 0, 255, { align: 'center', width: doc.page.width });

	doc
		.font('Helvetica')
		.fontSize(14)
		.fillColor('#444444')
		.text(`Instructed by: ${certificateData.instructorName}`, 0, 300, {
			align: 'center',
			width: doc.page.width,
		});

	doc
		.font('Helvetica')
		.fontSize(13)
		.fillColor('#444444')
		.text(`Date of Completion: ${certificateData.issuedAt.toDateString()}`, 0, 330, {
			align: 'center',
			width: doc.page.width,
		});

	doc
		.font('Helvetica')
		.fontSize(11)
		.fillColor('#888888')
		.text(`Certificate ID: ${certificateData.certificateId}`, 0, 370, {
			align: 'center',
			width: doc.page.width,
		});

	doc.moveTo(80, 395).lineTo(doc.page.width - 80, 395).stroke('#C9A84C');

	doc
		.font('Helvetica')
		.fontSize(12)
		.fillColor('#888888')
		.text('Online Course Platform', 0, 410, { align: 'center', width: doc.page.width });

	doc.end();
}

module.exports = { generateCertificatePDF };
