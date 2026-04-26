import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getCertificateById, getCertificateDownloadUrl } from '../../api/certificate.api';

const normalizePayload = (payload) => payload?.data ?? payload;

const font = { fontFamily: 'var(--font)' };

const CertificateVerify = () => {
	const { certificateId: certificateIdParam } = useParams();
	const certificateId = certificateIdParam ? decodeURIComponent(certificateIdParam) : '';

	const [cert, setCert] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [loadError, setLoadError] = useState('');

	const load = useCallback(async () => {
		if (!certificateId) {
			setLoadError('Invalid verification link.');
			setIsLoading(false);
			return;
		}
		setIsLoading(true);
		setLoadError('');
		try {
			const res = await getCertificateById(certificateId);
			const c = normalizePayload(res);
			if (!c?.certificateId) {
				setLoadError('No certificate was found for this ID.');
				setCert(null);
				return;
			}
			setCert(c);
		} catch (e) {
			const msg = String(e);
			setLoadError(
				msg.toLowerCase().includes('not found') ? 'No certificate was found for this ID.' : msg
			);
			setCert(null);
		} finally {
			setIsLoading(false);
		}
	}, [certificateId]);

	useEffect(() => {
		const t = setTimeout(() => {
			void load();
		}, 0);
		return () => clearTimeout(t);
	}, [load]);

	if (isLoading) {
		return (
			<main
				className="page-fade certificate-view-page"
				style={{
					...font,
					minHeight: 'calc(100vh - 64px)',
					background: 'var(--bg-primary)',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
				}}
			>
				<div className="spinner" />
			</main>
		);
	}

	if (loadError || !cert) {
		return (
			<main
				className="page-fade certificate-view-page"
				style={{
					...font,
					minHeight: 'calc(100vh - 64px)',
					padding: 48,
					background: 'var(--bg-primary)',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
				}}
			>
				<div
					className="card card-elevated-surface"
					style={{
						maxWidth: 520,
						width: '100%',
						padding: '32px 28px',
						textAlign: 'center',
						display: 'flex',
						flexDirection: 'column',
						gap: 16,
					}}
				>
					<h1 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--text-primary)' }}>
						Certificate not verified
					</h1>
					<p style={{ margin: 0, color: 'var(--text-dim)', lineHeight: 1.5 }}>{loadError}</p>
					<Link to="/" className="btn-secondary" style={{ alignSelf: 'center' }}>
						Back to home
					</Link>
				</div>
			</main>
		);
	}

	const studentName = cert.student?.name || 'Student';
	const courseTitle = cert.course?.title || 'Course';
	const instructorName = cert.course?.instructor?.name || 'Instructor';
	const issued = cert.issuedAt ? new Date(cert.issuedAt) : new Date();
	const dateLabel = issued.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
	const pdfHref = getCertificateDownloadUrl(cert.certificateId);

	return (
		<main
			className="page-fade certificate-view-page"
			style={{
				...font,
				minHeight: 'calc(100vh - 64px)',
				padding: '48px 24px',
				background: 'var(--bg-primary)',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				boxSizing: 'border-box',
			}}
		>
			<div
				className="card card-elevated-surface"
				style={{
					maxWidth: 560,
					width: '100%',
					padding: '36px 32px',
					display: 'flex',
					flexDirection: 'column',
					gap: 20,
				}}
			>
				<div
					style={{
						display: 'inline-flex',
						alignItems: 'center',
						gap: 10,
						alignSelf: 'flex-start',
						padding: '6px 12px',
						borderRadius: 999,
						background: 'color-mix(in srgb, var(--success) 18%, transparent)',
						color: 'var(--success)',
						fontSize: 13,
						fontWeight: 600,
					}}
				>
					Verified
				</div>
				<h1 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--text-primary)', lineHeight: 1.25 }}>
					This is a valid certificate of completion
				</h1>
				<dl
					style={{
						margin: 0,
						display: 'grid',
						gap: '12px 24px',
						gridTemplateColumns: 'auto 1fr',
						fontSize: 15,
					}}
				>
					<dt style={{ color: 'var(--text-dim)', fontWeight: 500 }}>Recipient</dt>
					<dd style={{ margin: 0, color: 'var(--text-primary)' }}>{studentName}</dd>
					<dt style={{ color: 'var(--text-dim)', fontWeight: 500 }}>Course</dt>
					<dd style={{ margin: 0, color: 'var(--text-primary)' }}>{courseTitle}</dd>
					<dt style={{ color: 'var(--text-dim)', fontWeight: 500 }}>Instructor</dt>
					<dd style={{ margin: 0, color: 'var(--text-primary)' }}>{instructorName}</dd>
					<dt style={{ color: 'var(--text-dim)', fontWeight: 500 }}>Issued</dt>
					<dd style={{ margin: 0, color: 'var(--text-primary)' }}>{dateLabel}</dd>
					<dt style={{ color: 'var(--text-dim)', fontWeight: 500 }}>Certificate ID</dt>
					<dd style={{ margin: 0, color: 'var(--text-primary)', fontFamily: 'ui-monospace, monospace' }}>
						{cert.certificateId}
					</dd>
				</dl>
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
					<a href={pdfHref} className="btn-primary" target="_blank" rel="noopener noreferrer">
						Download PDF
					</a>
					<Link to="/courses" className="btn-secondary">
						Browse courses
					</Link>
				</div>
			</div>
		</main>
	);
};

export default CertificateVerify;
