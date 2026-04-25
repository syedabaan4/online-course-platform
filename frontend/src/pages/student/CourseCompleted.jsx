import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { checkCompletion, generateCertificate } from '../../api/certificate.api';
import { getCourseById } from '../../api/course.api';
import { getCourseProgress } from '../../api/progress.api';
import { showError, showSuccess } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';

const normalizePayload = (payload) => payload?.data ?? payload;

const font = { fontFamily: 'var(--font)' };

function sortModules(c) {
	if (!c?.modules) {
		return [];
	}
	return [...c.modules].sort((a, b) => (a.order || 0) - (b.order || 0));
}

const CourseCompleted = () => {
	const { courseId: courseIdParam } = useParams();
	const navigate = useNavigate();
	const { user } = useAuth();
	const courseId = parseInt(courseIdParam, 10);

	const [course, setCourse] = useState(null);
	const [progress, setProgress] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [loadError, setLoadError] = useState('');
	const [certLoading, setCertLoading] = useState(false);
	const [incompleteRedirect, setIncompleteRedirect] = useState(false);

	const firstName = useMemo(() => {
		const n = (user?.name || '').trim();
		if (!n) {
			return 'Student';
		}
		return n.split(/\s+/)[0];
	}, [user?.name]);

	const sortedModules = useMemo(() => sortModules(course), [course]);

	const totalLectures = useMemo(
		() => sortedModules.reduce((n, m) => n + (Array.isArray(m.lectures) ? m.lectures.length : 0), 0),
		[sortedModules]
	);

	const publishedQuizCount = useMemo(
		() => sortedModules.filter((m) => m.quiz?.isPublished).length,
		[sortedModules]
	);

	const load = useCallback(async () => {
		if (!Number.isFinite(courseId) || courseId < 1) {
			setLoadError('Invalid course.');
			setIsLoading(false);
			return;
		}
		setIsLoading(true);
		setLoadError('');
		setIncompleteRedirect(false);
		try {
			const compRes = await checkCompletion(courseId);
			const comp = normalizePayload(compRes);
			if (!comp?.completed) {
				setIncompleteRedirect(true);
				navigate(`/learn/${courseId}`, { replace: true });
				return;
			}

			const cRes = await getCourseById(courseId);
			const c = normalizePayload(cRes);
			if (!c?.modules) {
				setLoadError('Course not found.');
				setCourse(null);
				return;
			}
			setCourse(c);

			try {
				const pRes = await getCourseProgress(courseId);
				setProgress(normalizePayload(pRes));
			} catch {
				setProgress(null);
			}
		} catch (e) {
			setLoadError(String(e));
			setCourse(null);
		} finally {
			setIsLoading(false);
		}
	}, [courseId, navigate]);

	useEffect(() => {
		const t = setTimeout(() => {
			void load();
		}, 0);
		return () => clearTimeout(t);
	}, [load]);

	const handleGetCertificate = async () => {
		setCertLoading(true);
		try {
			await generateCertificate(courseId);
			showSuccess('Your certificate is ready.');
			navigate('/certificates');
		} catch (e) {
			showError(String(e));
		} finally {
			setCertLoading(false);
		}
	};

	const courseTitle = course?.title || 'this course';
	const progressPct = progress?.percentage != null ? Math.min(100, Math.max(0, progress.percentage)) : 100;

	if (isLoading) {
		return (
			<main
				className="page-fade"
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

	if (incompleteRedirect) {
		return null;
	}

	if (loadError || !course) {
		return (
			<main
				className="page-fade"
				style={{ ...font, minHeight: 'calc(100vh - 64px)', padding: 48, background: 'var(--bg-primary)' }}
			>
				<p style={{ color: 'var(--error)', marginBottom: 16 }}>{loadError || 'Unable to load this page.'}</p>
				<Link to={Number.isFinite(courseId) ? `/learn/${courseId}` : '/my-courses'} className="btn-secondary">
					Back
				</Link>
			</main>
		);
	}

	return (
		<div
			className="page-fade"
			style={{
				...font,
				minHeight: 'calc(100vh - 64px)',
				background: 'var(--bg-primary)',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'stretch',
			}}
		>
			<div
				style={{
					flex: 1,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					padding: '125px 16px',
					position: 'relative',
					overflow: 'hidden',
					background: `
            radial-gradient(ellipse 70% 70% at 18% 22%, color-mix(in srgb, var(--accent) 2%, transparent) 0%, transparent 50%),
            radial-gradient(ellipse 70% 70% at 82% 78%, color-mix(in srgb, var(--accent) 2%, transparent) 0%, transparent 50%),
            var(--bg-primary)
          `,
				}}
			>
				<DecoIcon
					aria-hidden
					style={{ position: 'absolute', left: '8%', top: '8%', transform: 'rotate(12deg)' }}
					size={48}
					opacity={0.2}
				>
					<StarDeco />
				</DecoIcon>
				<DecoIcon
					aria-hidden
					style={{ position: 'absolute', right: '8%', bottom: '12%', transform: 'rotate(-12deg)' }}
					size={64}
					opacity={0.2}
				>
					<CelebrationDeco />
				</DecoIcon>
				<DecoIcon
					aria-hidden
					style={{ position: 'absolute', left: '12%', bottom: '20%' }}
					size={32}
					opacity={0.1}
				>
					<VerifiedDeco />
				</DecoIcon>

				<div
					style={{
						width: '100%',
						maxWidth: 672,
						background: 'var(--bg-surface)',
						borderRadius: 16,
						border: '1px solid var(--border-light)',
						boxShadow: 'var(--shadow-elevated)',
						overflow: 'hidden',
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'stretch',
						position: 'relative',
						zIndex: 1,
					}}
				>
					<div style={{ height: 8, background: 'var(--text-primary)', width: '100%' }} />
					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							padding: '48px 40px 40px',
							gap: 12,
						}}
					>
						<div style={{ position: 'relative', marginBottom: 8 }}>
							<div
								style={{
									width: 96,
									height: 96,
									borderRadius: 9999,
									background: 'var(--accent-bg)',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
								}}
							>
								<GradCapIcon size={44} color="var(--text-primary)" />
							</div>
							<div
								aria-hidden
								style={{
									position: 'absolute',
									right: -4,
									top: -8,
									width: 28,
									height: 28,
									borderRadius: 9999,
									background: 'var(--success)',
									border: '4px solid var(--bg-surface)',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
								}}
							>
								<MiniCheck color="var(--bg-surface)" />
							</div>
						</div>

						<h1
							style={{
								color: 'var(--text-primary)',
								fontSize: 36,
								fontWeight: 700,
								lineHeight: '40px',
								textAlign: 'center',
								margin: 0,
							}}
						>
							Congratulations, {firstName}!
						</h1>

						<div style={{ textAlign: 'center', maxWidth: 448, marginBottom: 8 }}>
							<p style={{ color: 'var(--text-secondary)', fontSize: 18, lineHeight: '28px', margin: 0 }}>
								You have successfully completed
								<br />
								<span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>&quot;{courseTitle}&quot;</span>
							</p>
						</div>

						<div style={{ width: '100%', maxWidth: 448, marginTop: 8 }}>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
								<span style={{ color: 'var(--text-body)', fontSize: 14, fontWeight: 600, lineHeight: '20px' }}>Course Progress</span>
								<span style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 700, lineHeight: '20px' }}>{Math.round(progressPct)}%</span>
							</div>
							<div
								style={{
									height: 12,
									background: 'var(--bg-elevated)',
									borderRadius: 9999,
									overflow: 'hidden',
									width: '100%',
								}}
							>
								<div
									style={{
										width: `${progressPct}%`,
										height: '100%',
										background: 'var(--success)',
										borderRadius: 9999,
										boxShadow: '0 0 10px color-mix(in srgb, var(--success) 50%, transparent)',
									}}
								/>
							</div>
						</div>

						<div
							style={{
								display: 'flex',
								flexWrap: 'wrap',
								justifyContent: 'center',
								gap: 32,
								marginTop: 12,
								width: '100%',
							}}
						>
							<StatPill
								text={`All ${totalLectures} ${totalLectures === 1 ? 'lecture' : 'lectures'} completed`}
							/>
							<StatPill
								text={
									publishedQuizCount > 0
										? `All ${publishedQuizCount} module ${publishedQuizCount === 1 ? 'quiz' : 'quizzes'} passed`
										: 'All module requirements met'
								}
							/>
						</div>

						<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginTop: 24, width: '100%', maxWidth: 320 }}>
							<button
								type="button"
								className="btn-primary"
								onClick={handleGetCertificate}
								disabled={certLoading}
								style={{
									width: '100%',
									borderRadius: 12,
									padding: '14px 24px',
									fontSize: 16,
									fontWeight: 700,
									display: 'inline-flex',
									alignItems: 'center',
									justifyContent: 'center',
									gap: 8,
									boxShadow: '0 4px 6px -4px color-mix(in srgb, var(--accent) 30%, transparent), 0 10px 15px -3px color-mix(in srgb, var(--accent) 30%, transparent)',
								}}
							>
								<CertificateIcon size={16} color="var(--bg-surface)" />
								{certLoading ? '…' : 'Get Certificate'}
							</button>
							<Link
								to="/my-courses"
								style={{
									display: 'inline-flex',
									alignItems: 'center',
									gap: 8,
									padding: '8px 24px',
									borderRadius: 12,
									color: 'var(--text-body)',
									fontSize: 16,
									fontWeight: 500,
									lineHeight: '24px',
									textDecoration: 'none',
								}}
							>
								<ArrowBackIcon size={14} color="var(--text-body)" />
								Back to My Courses
							</Link>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

function StatPill({ text }) {
	return (
		<div
			style={{
				padding: '12px 16px',
				background: 'var(--bg-surface-alt)',
				borderRadius: 8,
				border: '1px solid var(--border-light)',
				display: 'inline-flex',
				alignItems: 'center',
				gap: 12,
			}}
		>
			<div
				style={{
					width: 24,
					height: 24,
					borderRadius: 9999,
					background: 'color-mix(in srgb, var(--success) 12%, var(--bg-surface))',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					flexShrink: 0,
				}}
			>
				<CheckTiny color="var(--success)" />
			</div>
			<span style={{ color: 'var(--text-body)', fontSize: 14, fontWeight: 500, lineHeight: '20px' }}>{text}</span>
		</div>
	);
}

function CheckTiny({ color }) {
	return (
		<svg width="12" height="10" viewBox="0 0 12 10" fill="none" aria-hidden>
			<path d="M1 5.2L4.2 8.4L10.2 0.4" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

function MiniCheck({ color }) {
	return (
		<svg width="10" height="8" viewBox="0 0 12 10" fill="none" aria-hidden>
			<path d="M1 5.2L4.2 8.4L10.2 0.4" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

function GradCapIcon({ size, color }) {
	return (
		<svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden>
			<path
				d="M32 8L4 20L32 32L60 20L32 8Z"
				fill={color}
			/>
			<path
				d="M4 20V40C4 40 32 48 32 48C32 48 60 40 60 40V20"
				stroke={color}
				strokeWidth="2"
				strokeLinejoin="round"
			/>
			<path d="M32 32V52" stroke={color} strokeWidth="2" strokeLinecap="round" />
			<circle cx="32" cy="54" r="2" fill={color} />
		</svg>
	);
}

function CertificateIcon({ size, color }) {
	return (
		<svg width={size} height={size} viewBox="0 0 16 20" fill="none" aria-hidden>
			<path
				d="M2 2h12v11H2V2Z"
				stroke={color}
				strokeWidth="1.4"
			/>
			<path d="M4 5h8M4 8h5" stroke={color} strokeWidth="1.1" strokeLinecap="round" />
			<path d="M5 19l1.5-3h3L11 19" stroke={color} strokeWidth="1.1" />
		</svg>
	);
}

function ArrowBackIcon({ size, color }) {
	return (
		<svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden>
			<path
				d="M9.5 6H2.5M2.5 6L5.5 3M2.5 6L5.5 9"
				stroke={color}
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

function DecoIcon({ children, size, opacity, style }) {
	return (
		<div
			aria-hidden
			style={{
				...style,
				width: size,
				height: size,
				opacity,
				color: 'var(--accent)',
			}}
		>
			{children}
		</div>
	);
}

function StarDeco() {
	return (
		<svg width="100%" height="100%" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
			<path d="M12 2L14.2 8.2L20 8.8L16 12.2L17.1 18L12 15.1L6.9 18L8 12.2L4 8.8L9.8 8.2L12 2Z" />
		</svg>
	);
}

function CelebrationDeco() {
	return (
		<svg width="100%" height="100%" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
			<path d="M4 4h2v2H4V4zm14 0h2v2h-2V4zM4 18h2v2H4v-2zm14 0h2v2h-2v-2zM7 2v2H5V2h2zm10 0v2h-2V2h2zM2 7h2v2H2V7zm18 0h2v2h-2V7zM2 15h2v2H2v-2zm18 0h2v2h-2v-2zM7 20v2H5v-2h2zm10 0v2h-2v-2h2z" />
			<path d="M12 5c-2.8 0-5 2.2-5 5h10c0-2.8-2.2-5-5-5zm0 12c-1.1 0-2-.4-2.6-1h5.2c-.6.6-1.5 1-2.6 1z" />
		</svg>
	);
}

function VerifiedDeco() {
	return (
		<svg width="100%" height="100%" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
			<path d="M12 2L4 5v5c0 5.5 3.4 10.3 8 12 4.6-1.7 8-6.5 8-12V5l-8-3z" />
		</svg>
	);
}

export default CourseCompleted;
