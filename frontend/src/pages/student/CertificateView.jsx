import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getCertificateById, getCertificateDownloadUrl } from '../../api/certificate.api';

const normalizePayload = (payload) => payload?.data ?? payload;

const font = { fontFamily: 'var(--font)' };
const playfair = "'Playfair Display', Georgia, serif";
const greatVibes = "'Great Vibes', cursive";

const CertificateView = () => {
	const { certificateId: certificateIdParam } = useParams();
	const certificateId = certificateIdParam ? decodeURIComponent(certificateIdParam) : '';

	const [cert, setCert] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [loadError, setLoadError] = useState('');

	const load = useCallback(async () => {
		if (!certificateId) {
			setLoadError('Invalid certificate.');
			setIsLoading(false);
			return;
		}
		setIsLoading(true);
		setLoadError('');
		try {
			const res = await getCertificateById(certificateId);
			const c = normalizePayload(res);
			if (!c?.certificateId) {
				setLoadError('Certificate not found.');
				setCert(null);
				return;
			}
			setCert(c);
		} catch (e) {
			setLoadError(String(e));
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

	const downloadHref = cert ? getCertificateDownloadUrl(cert.certificateId) : '#';

	if (isLoading) {
		return (
			<main
				className="page-fade"
				style={{
					...font,
					minHeight: 'calc(100vh - 64px)',
					background: 'var(--bg-surface-alt)',
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
				className="page-fade"
				style={{ ...font, minHeight: 'calc(100vh - 64px)', padding: 48, background: 'var(--bg-surface-alt)' }}
			>
				<p style={{ color: 'var(--error)', marginBottom: 16 }}>{loadError || 'Certificate unavailable.'}</p>
				<Link to="/certificates" className="btn-secondary">
					Back to My Certificates
				</Link>
			</main>
		);
	}

	const studentName = cert.student?.name || 'Student';
	const courseTitle = cert.course?.title || 'Course';
	const instructorName = cert.course?.instructor?.name || 'Instructor';
	const issued = cert.issuedAt ? new Date(cert.issuedAt) : new Date();
	const dateLabel = issued.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
	const verifyLine =
		typeof window !== 'undefined' ? `${window.location.host}/verify/${encodeURIComponent(cert.certificateId)}` : '';

	return (
		<div
			className="page-fade"
			style={{
				...font,
				minHeight: 'calc(100vh - 64px)',
				background: 'var(--bg-surface-alt)',
				padding: 32,
				boxSizing: 'border-box',
			}}
		>
			<div
				style={{
					width: '100%',
					maxWidth: 1024,
					margin: '0 auto',
					display: 'flex',
					flexDirection: 'column',
					gap: 32,
					alignItems: 'stretch',
				}}
			>
				<Link
					to="/certificates"
					style={{
						fontSize: 14,
						fontWeight: 500,
						color: 'var(--text-muted)',
						textDecoration: 'none',
						alignSelf: 'flex-start',
					}}
				>
					← My Certificates
				</Link>
				<div
					style={{
						display: 'flex',
						flexWrap: 'wrap',
						justifyContent: 'space-between',
						alignItems: 'center',
						gap: 24,
						paddingBottom: 24,
						borderBottom: '1px solid var(--border)',
					}}
				>
					<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, minWidth: 0 }}>
						<div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
							<MedalIcon size={16} color="var(--text-primary)" />
							<span
								style={{
									color: 'var(--text-primary)',
									fontSize: 14,
									fontWeight: 700,
									textTransform: 'uppercase',
									letterSpacing: '0.7px',
									lineHeight: '20px',
								}}
							>
								Completion
							</span>
						</div>
						<h1
							style={{
								color: 'var(--text-primary)',
								fontSize: 36,
								fontWeight: 900,
								lineHeight: '40px',
								margin: 0,
							}}
						>
							Your Certificate
						</h1>
						<p
							style={{
								color: 'var(--text-muted)',
								fontSize: 16,
								lineHeight: '24px',
								margin: '4px 0 0',
								maxWidth: 520,
							}}
						>
							View, download, or print your official certificate of completion.
						</p>
					</div>
					<a
						href={downloadHref}
						target="_blank"
						rel="noreferrer"
						className="btn-primary"
						style={{
							display: 'inline-flex',
							alignItems: 'center',
							gap: 8,
							padding: '12px 24px',
							textDecoration: 'none',
							boxShadow: '0 4px 6px -4px color-mix(in srgb, var(--accent) 20%, transparent), 0 10px 15px -3px color-mix(in srgb, var(--accent) 20%, transparent)',
						}}
					>
						<DownloadIcon size={16} color="var(--bg-surface)" />
						Download PDF
					</a>
				</div>

				<div
					style={{
						background: 'var(--bg-surface)',
						borderRadius: 12,
						boxShadow: 'var(--shadow-elevated)',
						padding: 32,
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
					}}
				>
					<CertificateFrame
						studentName={studentName}
						courseTitle={courseTitle}
						instructorName={instructorName}
						certificateId={cert.certificateId}
						dateLabel={dateLabel}
						verifyLine={verifyLine}
					/>
				</div>

				<div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 32 }}>
					<div
						className="card"
						style={{
							borderRadius: 9999,
							padding: '10px 20px 10px 16px',
							display: 'inline-flex',
							alignItems: 'center',
							gap: 8,
							boxShadow: 'var(--shadow-card)',
							margin: 0,
						}}
					>
						<InfoIcon style={{ color: 'var(--text-muted)', width: 14, height: 14, flexShrink: 0 }} />
						<span style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: '20px' }}>Also available in: </span>
						<Link to="/my-courses" style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 500 }}>
							My Learning
						</Link>
						<span style={{ color: 'var(--text-muted)' }}> &gt; </span>
						<Link to="/certificates" style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 500 }}>
							My Certificates
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
};

function CertificateFrame({ studentName, courseTitle, instructorName, certificateId, dateLabel, verifyLine }) {
	return (
		<div
			style={{
				width: '100%',
				maxWidth: 960,
				position: 'relative',
				minHeight: 560,
				outline: `12px solid color-mix(in srgb, var(--accent) 20%, transparent)`,
				outlineOffset: 0,
				borderRadius: 4,
				padding: 20,
				boxSizing: 'border-box',
			}}
		>
			<CornerL style={{ top: 8, left: 8 }} />
			<CornerR style={{ top: 8, right: 8 }} />
			<CornerBL style={{ bottom: 8, left: 8 }} />
			<CornerBR style={{ bottom: 8, right: 8 }} />

			<div
				aria-hidden
				style={{
					position: 'absolute',
					inset: 12,
					pointerEvents: 'none',
					opacity: 0.03,
					background: `radial-gradient(ellipse 70% 70% at 50% 50%, color-mix(in srgb, var(--accent) 40%, transparent) 0%, transparent 60%)`,
					borderRadius: 4,
				}}
			/>

			<div
				aria-hidden
				style={{
					position: 'absolute',
					left: '50%',
					top: 120,
					transform: 'translateX(-50%)',
					width: 280,
					height: 220,
					opacity: 0.03,
					color: 'var(--text-primary)',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					pointerEvents: 'none',
				}}
			>
				<GradCapIcon style={{ width: '100%', height: '100%' }} />
			</div>

			<div
				style={{
					position: 'relative',
					zIndex: 1,
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					padding: '0 16px 120px',
					textAlign: 'center',
				}}
			>
				<GradCapIcon style={{ width: 36, height: 34, marginBottom: 12, color: 'var(--text-primary)' }} />
				<div
					style={{
						fontFamily: playfair,
						color: 'var(--text-primary)',
						fontSize: 48,
						fontWeight: 700,
						textTransform: 'uppercase',
						letterSpacing: 4.8,
						lineHeight: 1,
					}}
				>
					Certificate
				</div>
				<div
					style={{
						fontFamily: playfair,
						color: 'var(--text-secondary)',
						fontSize: 20,
						fontWeight: 400,
						textTransform: 'uppercase',
						letterSpacing: 4,
						marginTop: 8,
					}}
				>
					of completion
				</div>

				<div style={{ maxWidth: 768, marginTop: 40 }}>
					<div style={{ fontFamily: playfair, fontStyle: 'italic', color: 'var(--text-muted)', fontSize: 18, lineHeight: '28px' }}>
						This is to certify that
					</div>
					<div
						style={{
							fontFamily: greatVibes,
							color: 'var(--text-primary)',
							fontSize: 'clamp(48px, 8vw, 96px)',
							lineHeight: 1.1,
							padding: '8px 32px 24px',
							borderBottom: '1px solid var(--border)',
							marginTop: 8,
						}}
					>
						{studentName}
					</div>
					<div
						style={{
							fontFamily: playfair,
							fontStyle: 'italic',
							color: 'var(--text-muted)',
							fontSize: 18,
							lineHeight: '28px',
							marginTop: 16,
						}}
					>
						has successfully completed the course
					</div>
					<div
						style={{
							fontFamily: 'var(--font)',
							color: 'var(--text-primary)',
							fontSize: 36,
							fontWeight: 700,
							lineHeight: '40px',
							marginTop: 12,
						}}
					>
						{courseTitle}
					</div>
				</div>
			</div>

			<div
				style={{
					position: 'absolute',
					left: 32,
					right: 32,
					bottom: 32,
					paddingTop: 32,
					borderTop: '1px solid var(--border-light)',
					display: 'flex',
					flexWrap: 'wrap',
					justifyContent: 'space-between',
					alignItems: 'flex-end',
					gap: 24,
					zIndex: 1,
				}}
			>
				<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 120 }}>
					<InstructorAvatar name={instructorName} />
					<div style={{ width: 128, height: 1, background: 'var(--text-dim)', margin: '4px 0 8px' }} />
					<div style={{ color: 'var(--text-body)', fontSize: 14, fontWeight: 700, lineHeight: '20px' }}>{instructorName}</div>
					<div
						style={{
							color: 'var(--text-muted)',
							fontSize: 12,
							textTransform: 'uppercase',
							letterSpacing: '0.6px',
							lineHeight: '16px',
						}}
					>
						Instructor
					</div>
				</div>

				<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, textAlign: 'right' }}>
					<div
						style={{
							padding: '4px 12px',
							background: 'color-mix(in srgb, var(--accent) 5%, var(--bg-surface))',
							border: '1px solid color-mix(in srgb, var(--accent) 10%, var(--border))',
							borderRadius: 4,
						}}
					>
						<span
							style={{
								color: 'var(--text-primary)',
								fontSize: 12,
								fontFamily: 'ui-monospace, monospace',
								letterSpacing: '0.6px',
							}}
						>
							ID: {certificateId}
						</span>
					</div>
					<div style={{ fontSize: 14, lineHeight: '20px' }}>
						<span style={{ color: 'var(--text-muted)' }}>Date Issued: </span>
						<span style={{ color: 'var(--text-body)', fontWeight: 600 }}>{dateLabel}</span>
					</div>
					<div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
						<LinkIcon color="var(--text-dim)" />
						<span style={{ color: 'var(--text-dim)', fontSize: 12, lineHeight: '16px' }}>{verifyLine}</span>
					</div>
				</div>
			</div>
		</div>
	);
}

function CornerL({ style }) {
	return (
		<div
			aria-hidden
			style={{
				position: 'absolute',
				width: 64,
				height: 64,
				borderLeft: '4px solid var(--text-primary)',
				borderTop: '4px solid var(--text-primary)',
				...style,
			}}
		/>
	);
}

function CornerR({ style }) {
	return (
		<div
			aria-hidden
			style={{
				position: 'absolute',
				width: 64,
				height: 64,
				borderRight: '4px solid var(--text-primary)',
				borderTop: '4px solid var(--text-primary)',
				...style,
			}}
		/>
	);
}

function CornerBL({ style }) {
	return (
		<div
			aria-hidden
			style={{
				position: 'absolute',
				width: 64,
				height: 64,
				borderLeft: '4px solid var(--text-primary)',
				borderBottom: '4px solid var(--text-primary)',
				...style,
			}}
		/>
	);
}

function CornerBR({ style }) {
	return (
		<div
			aria-hidden
			style={{
				position: 'absolute',
				width: 64,
				height: 64,
				borderRight: '4px solid var(--text-primary)',
				borderBottom: '4px solid var(--text-primary)',
				...style,
			}}
		/>
	);
}

function InstructorAvatar({ name }) {
	const initial = (name || '?').trim().charAt(0).toUpperCase() || '?';
	return (
		<div
			style={{
				width: 40,
				height: 40,
				borderRadius: 8,
				background: 'var(--bg-elevated)',
				color: 'var(--text-body)',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				fontSize: 16,
				fontWeight: 700,
				opacity: 0.9,
			}}
		>
			{initial}
		</div>
	);
}

function MedalIcon({ size, color }) {
	return (
		<svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
			<path
				d="M10 2L12.5 7L18 7.5L14 11L15 17L10 14L5 17L6 11L2 7.5L7.5 7L10 2Z"
				stroke={color}
				strokeWidth="1.2"
				fill="none"
			/>
		</svg>
	);
}

function DownloadIcon({ size, color }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
			<path
				d="M12 3V14M7 9l5 5 5-5M4 20h16"
				stroke={color}
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

function GradCapIcon({ style }) {
	return (
		<svg viewBox="0 0 64 64" fill="none" style={style} aria-hidden>
			<path
				d="M32 8L4 20L32 32L60 20L32 8Z"
				fill="currentColor"
			/>
			<path
				d="M4 20V40C4 40 32 48 32 48C32 48 60 40 60 40V20"
				stroke="currentColor"
				strokeWidth="2"
			/>
			<path d="M32 32V52" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
		</svg>
	);
}

function LinkIcon({ color }) {
	return (
		<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
			<path
				d="M5 2H2v8h7V7M3 6l4-4m0 0H5M7 2h3v3"
				stroke={color}
				strokeWidth="1.2"
				strokeLinecap="round"
			/>
		</svg>
	);
}

function InfoIcon({ style }) {
	return (
		<svg viewBox="0 0 20 20" style={style} fill="currentColor" aria-hidden>
			<path d="M10 0C4.5 0 0 4.5 0 10s4.5 10 10 10 10-4.5 10-10S15.5 0 10 0zm.75 4.5a.75.75 0 1 0-1.5 0v.5a.75.75 0 0 0 1.5 0v-.5zM8.75 9a.75.75 0 0 0 1.5 0V15a.75.75 0 0 0-1.5 0V9z" />
		</svg>
	);
}

export default CertificateView;
