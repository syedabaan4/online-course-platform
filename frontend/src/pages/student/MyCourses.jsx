import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { getMyEnrollments, unenrollFromCourse } from '../../api/enrollment.api';
import LoadingSpinner from '../../components/LoadingSpinner';

const normalizeList = (payload) => {
	if (Array.isArray(payload?.data)) {
		return payload.data;
	}
	if (Array.isArray(payload)) {
		return payload;
	}
	return [];
};

const clampPct = (n) => {
	const x = Number(n);
	if (Number.isNaN(x)) {
		return 0;
	}
	return Math.max(0, Math.min(100, Math.round(x * 10) / 10));
};

const relTime = (iso) => {
	if (!iso) {
		return '';
	}
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) {
		return '';
	}
	const s = Math.floor((Date.now() - d.getTime()) / 1000);
	if (s < 60) {
		return 'just now';
	}
	if (s < 3600) {
		return `${Math.floor(s / 60)} min ago`;
	}
	if (s < 86400) {
		return `${Math.floor(s / 3600)}h ago`;
	}
	if (s < 86400 * 7) {
		return `${Math.floor(s / 86400)}d ago`;
	}
	if (s < 86400 * 30) {
		return `${Math.floor(s / (86400 * 7))} wk ago`;
	}
	return `${Math.floor(s / (86400 * 30))} mo ago`;
};

const CategoryPill = ({ children }) => (
	<div
		style={{
			padding: 0,
			margin: 0,
			fontSize: 8,
			fontWeight: 700,
			textTransform: 'uppercase',
			letterSpacing: 0.6,
			lineHeight: '12px',
			fontFamily: 'var(--font)',
			width: 'fit-content',
			color: 'var(--text-muted)',
		}}
	>
		{children}
	</div>
);

const MoreIcon = () => (
	<svg width="4" height="16" viewBox="0 0 4 16" fill="none" aria-hidden="true" style={{ display: 'block' }}>
		<circle cx="2" cy="2" r="1.2" fill="currentColor" />
		<circle cx="2" cy="8" r="1.2" fill="currentColor" />
		<circle cx="2" cy="14" r="1.2" fill="currentColor" />
	</svg>
);

function UnenrollConfirmModal({ courseTitle, isSubmitting, onCancel, onConfirm }) {
	const handleBackdropClick = () => {
		if (!isSubmitting) {
			onCancel();
		}
	};

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="my-courses-unenroll-title"
			onClick={handleBackdropClick}
			className="my-courses-unenroll-modal-backdrop"
		>
			<div
				role="presentation"
				onClick={(e) => e.stopPropagation()}
				className="card my-courses-unenroll-modal"
			>
				<div className="my-courses-unenroll-modal__icon" aria-hidden>
					<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path
							d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 5h2v6h-2V7zm0 8h2v2h-2v-2z"
							fill="currentColor"
						/>
					</svg>
				</div>
				<h2 id="my-courses-unenroll-title" className="my-courses-unenroll-modal__title">
					Unenroll from this course?
				</h2>
				<p className="my-courses-unenroll-modal__body">
					You will be removed from <strong className="my-courses-unenroll-modal__course">{courseTitle}</strong>. You can enroll
					again anytime from the course page.
				</p>
				<div className="my-courses-unenroll-modal__actions">
					<button type="button" className="btn-secondary btn-sm my-courses-unenroll-modal__btn" onClick={onCancel} disabled={isSubmitting}>
						Cancel
					</button>
					<button type="button" className="btn-danger btn-sm my-courses-unenroll-modal__btn" onClick={onConfirm} disabled={isSubmitting}>
						{isSubmitting ? 'Unenrolling…' : 'Unenroll'}
					</button>
				</div>
			</div>
		</div>
	);
}

const CourseCardMenu = ({ courseId, courseTitle, isOpen, onToggle, onClose, onUnenrolled, onError }) => {
	const wrapRef = useRef(null);
	const [unenrolling, setUnenrolling] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);

	useEffect(() => {
		if (!isOpen) {
			return undefined;
		}
		const onDoc = (e) => {
			if (wrapRef.current && !wrapRef.current.contains(e.target)) {
				onClose();
			}
		};
		const onKey = (e) => {
			if (e.key === 'Escape') {
				onClose();
			}
		};
		document.addEventListener('mousedown', onDoc);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('mousedown', onDoc);
			document.removeEventListener('keydown', onKey);
		};
	}, [isOpen, onClose]);

	useEffect(() => {
		if (!confirmOpen) {
			return undefined;
		}
		const onKey = (e) => {
			if (e.key === 'Escape' && !unenrolling) {
				setConfirmOpen(false);
			}
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [confirmOpen, unenrolling]);

	const openUnenrollConfirm = () => {
		onClose();
		setConfirmOpen(true);
	};

	const closeUnenrollConfirm = () => {
		if (unenrolling) {
			return;
		}
		setConfirmOpen(false);
	};

	const runUnenroll = async () => {
		if (unenrolling) {
			return;
		}
		setUnenrolling(true);
		onError('');
		try {
			await unenrollFromCourse(courseId);
			setConfirmOpen(false);
			onUnenrolled();
		} catch (err) {
			onError(typeof err === 'string' ? err : 'Failed to unenroll. Please try again.');
		} finally {
			setUnenrolling(false);
		}
	};

	return (
		<>
			<div ref={wrapRef} className="my-courses-card-menu">
				<button
					type="button"
					className="my-courses-card-menu__trigger"
					aria-label="Course options"
					aria-expanded={isOpen}
					aria-haspopup="true"
					onClick={() => onToggle()}
					disabled={unenrolling}
				>
					<MoreIcon />
				</button>
				{isOpen ? (
					<div className="my-courses-card-menu__dropdown" role="menu" aria-label="Course actions">
						<button
							type="button"
							className="my-courses-card-menu__item my-courses-card-menu__item--danger"
							role="menuitem"
							onClick={openUnenrollConfirm}
							disabled={unenrolling}
						>
							Unenroll from course
						</button>
					</div>
				) : null}
			</div>
			{confirmOpen
				? createPortal(
						<UnenrollConfirmModal
							courseTitle={courseTitle}
							isSubmitting={unenrolling}
							onCancel={closeUnenrollConfirm}
							onConfirm={runUnenroll}
						/>,
						document.body
					)
				: null}
		</>
	);
};

const ArrowRight = () => (
	<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" style={{ color: 'var(--bg-surface)' }}>
		<path
			d="M2.5 6H9.5M9.5 6L6.5 3M9.5 6L6.5 9"
			stroke="currentColor"
			strokeWidth="1.3"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	</svg>
);

const CertIcon = ({ color = 'var(--success)' }) => (
	<svg width="12" height="14" viewBox="0 0 12 14" fill="none" aria-hidden="true" style={{ color, display: 'block' }}>
		<path
			d="M1 2.5C1 1.67157 1.67157 1 2.5 1H5.5L7 2.5H9.5C10.3284 2.5 11 3.17157 11 4V11.5C11 12.3284 10.3284 13 9.5 13H2.5C1.67157 13 1 12.3284 1 11.5V2.5Z"
			stroke="currentColor"
			strokeWidth="1.1"
		/>
		<path d="M3.5 5.5H8.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
	</svg>
);

const EnrollmentRowFigma = ({ enrollment, openMenuCourseId, onToggleMenu, closeMenu, onUnenrolled, onActionError }) => {
	const { course, completionPercentage, totalLectures, enrolledAt } = enrollment;
	const courseObj = course || {};
	const courseId = enrollment.courseId ?? courseObj.id;
	const instName = courseObj.instructor?.name || 'Instructor';
	const pct = clampPct(completionPercentage);
	const isComplete = pct >= 100;
	const isInProgress = pct > 0 && pct < 100;
	const modLabel = (() => {
		const n = totalLectures != null ? totalLectures : 0;
		return `${n} ${n === 1 ? 'lecture' : 'lectures'}`;
	})();

	const [imgErr, setImgErr] = useState(false);
	const firstLetter = (courseObj.title || 'C').trim().charAt(0).toUpperCase();

	return (
		<div
			className="my-courses-enrollment-card"
			style={{
				alignSelf: 'stretch',
				padding: 20,
				display: 'flex',
				flexWrap: 'wrap',
				justifyContent: 'flex-start',
				alignItems: 'flex-start',
				gap: 24,
			}}
		>
			<div
				style={{
					width: '100%',
					maxWidth: 256,
					flexShrink: 0,
					alignSelf: 'flex-start',
					aspectRatio: '256 / 172',
					position: 'relative',
					borderRadius: 'var(--radius-sm)',
					overflow: 'hidden',
					background: 'var(--bg-elevated)',
				}}
			>
				{imgErr || !courseObj.thumbnailUrl ? (
					<div
						style={{
							width: '100%',
							height: '100%',
							minHeight: 0,
							background: 'linear-gradient(135deg, var(--accent-badge-bg) 0%, var(--bg-elevated) 100%)',
							display: 'grid',
							placeItems: 'center',
							color: 'var(--accent)',
							fontSize: 48,
							fontWeight: 700,
							fontFamily: 'var(--font)',
						}}
					>
						{firstLetter}
					</div>
				) : (
					<img
						src={courseObj.thumbnailUrl}
						alt=""
						style={{
							width: '100%',
							height: '100%',
							objectFit: 'cover',
							display: 'block',
						}}
						onError={() => setImgErr(true)}
					/>
				)}
				<div
					style={{
						pointerEvents: 'none',
						position: 'absolute',
						inset: 0,
						background: 'color-mix(in srgb, var(--text-primary) 10%, transparent)',
					}}
				/>
			</div>

			<div
				style={{
					flex: '1 1 280px',
					minWidth: 0,
					paddingTop: 4,
					paddingBottom: 4,
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'space-between',
					alignItems: 'flex-start',
					gap: 16,
					position: 'relative',
					zIndex: 1,
				}}
			>
				<div
					className="my-courses-enrollment-card__head"
					style={{
						alignSelf: 'stretch',
						display: 'grid',
						gridTemplateColumns: isComplete ? 'minmax(0, 1fr)' : 'minmax(0, 1fr) auto',
						alignItems: 'start',
						columnGap: 12,
						rowGap: 0,
						width: '100%',
					}}
				>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
						<CategoryPill>
							{courseObj.category || 'General'}
						</CategoryPill>

						<Link
							to={`/courses/${courseObj.id}`}
							style={{
								color: 'var(--text-primary)',
								fontSize: 20,
								fontWeight: 700,
								lineHeight: '25px',
								fontFamily: 'var(--font)',
							}}
						>
							{courseObj.title}
						</Link>

						<div style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: '20px', fontFamily: 'var(--font)' }}>
							Instructor: {instName} • {modLabel}
							{isComplete ? ` • Completed ${relTime(enrolledAt) || 'recently'}` : null}
						</div>
					</div>
					{!isComplete ? (
						<div
							className="my-courses-enrollment-card__kebab"
							style={{ justifySelf: 'end', alignSelf: 'start' }}
						>
							<CourseCardMenu
								courseId={courseId}
								courseTitle={courseObj.title || 'Course'}
								isOpen={openMenuCourseId === courseId}
								onToggle={() => onToggleMenu(courseId)}
								onClose={closeMenu}
								onUnenrolled={onUnenrolled}
								onError={onActionError}
							/>
						</div>
					) : null}
				</div>

				{isInProgress || (!isComplete && !isInProgress) ? (
					<div style={{ alignSelf: 'stretch', display: 'flex', flexDirection: 'column', gap: 8 }}>
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
							<span style={{ color: 'var(--text-body)', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font)' }}>Progress</span>
							<span style={{ color: 'var(--text-body)', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font)' }}>{Math.round(pct)}%</span>
						</div>
						<div
							className="progress-bar"
							style={{ height: 8, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-pill)' }}
						>
							<div
								className="progress-fill"
								style={{
									width: `${pct}%`,
									background: 'var(--text-primary)',
									height: 8,
									borderRadius: 'var(--radius-pill)',
								}}
							/>
						</div>
						<div style={{ display: 'flex', justifyContent: 'flex-end' }}>
							<Link
								to={`/learn/${courseObj.id}`}
								className="btn-primary btn-sm my-courses-action-btn"
							>
								Continue Learning
								<ArrowRight />
							</Link>
						</div>
					</div>
				) : null}

				{isComplete ? (
					<div style={{ alignSelf: 'stretch', display: 'flex', flexDirection: 'column', gap: 16 }}>
						<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
								<div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
									<span style={{ color: 'var(--success)', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font)' }}>Course Completed</span>
									<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" style={{ color: 'var(--success)' }}>
										<path
											d="M2.5 6.5L5 9L9.5 3.5"
											stroke="currentColor"
											strokeWidth="1.2"
											strokeLinecap="round"
											strokeLinejoin="round"
										/>
									</svg>
								</div>
								<span style={{ color: 'var(--success)', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font)' }}>100%</span>
							</div>
							<div
								className="progress-bar"
								style={{ height: 8, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}
							>
								<div
									style={{
										width: '100%',
										height: 8,
										background: 'var(--success)',
										borderRadius: 'var(--radius-pill)',
									}}
								/>
						</div>
						</div>
						<div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 12, alignItems: 'center' }}>
							<Link
								to={`/courses/${courseObj.id}`}
								className="btn-secondary btn-sm my-courses-action-btn"
							>
								Review
							</Link>
							<Link to="/certificates" className="btn-certificate-amber my-courses-action-btn">
								<CertIcon color="currentColor" />
								Get Certificate
							</Link>
						</div>
					</div>
				) : null}
			</div>
		</div>
	);
};

const MyCourses = () => {
	const [enrollments, setEnrollments] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [loadError, setLoadError] = useState('');
	const [actionError, setActionError] = useState('');
	const [openMenuCourseId, setOpenMenuCourseId] = useState(null);
	const [sortBy, setSortBy] = useState('progress');

	const closeMenu = useCallback(() => setOpenMenuCourseId(null), []);

	const load = useCallback(async () => {
		setIsLoading(true);
		setLoadError('');
		setActionError('');
		try {
			const res = await getMyEnrollments();
			setEnrollments(normalizeList(res));
		} catch (e) {
			setLoadError(String(e));
			setEnrollments([]);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		queueMicrotask(() => {
			void load();
		});
	}, [load]);

	const sorted = useMemo(() => {
		const list = [...enrollments];
		if (sortBy === 'title') {
			return list.sort((a, b) => String(a.course?.title || '').localeCompare(String(b.course?.title || ''), undefined, { sensitivity: 'base' }));
		}
		return list.sort((a, b) => clampPct(b.completionPercentage) - clampPct(a.completionPercentage));
	}, [enrollments, sortBy]);

	if (isLoading) {
		return <LoadingSpinner fullPage />;
	}

	return (
		<div
			style={{
				width: '100%',
				background: 'var(--bg-primary)',
				minHeight: 'calc(100vh - 64px)',
				display: 'flex',
				flexDirection: 'column',
				fontFamily: 'var(--font)',
			}}
		>
			<main
				className="page-fade"
				style={{
					flex: 1,
					width: '100%',
					maxWidth: 1280,
					margin: '0 auto',
					padding: 32,
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
				}}
			>
				<div
					style={{
						width: '100%',
						maxWidth: 960,
						display: 'flex',
						flexDirection: 'column',
						gap: 32,
					}}
				>
					<div
						style={{
							alignSelf: 'stretch',
							display: 'flex',
							flexWrap: 'wrap',
							justifyContent: 'space-between',
							alignItems: 'flex-end',
							gap: 20,
						}}
					>
						<div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
							<h1
								style={{
									margin: 0,
									color: 'var(--text-primary)',
									fontSize: 36,
									fontWeight: 900,
									lineHeight: '40px',
									fontFamily: 'var(--font)',
								}}
							>
								My Courses
							</h1>
							<p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 16, lineHeight: '24px', fontFamily: 'var(--font)' }}>
								Welcome back! Continue where you left off.
							</p>
						</div>
						<div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
							<span className="label" style={{ marginBottom: 0, color: 'var(--text-muted)', fontWeight: 400 }}>
								Sort by:
							</span>
							<select
								className="select"
								value={sortBy}
								onChange={(e) => setSortBy(e.target.value)}
								aria-label="Sort enrollments"
								style={{ width: 201, height: 38, boxShadow: 'var(--shadow-card)' }}
							>
								<option value="progress">Progress (high to low)</option>
								<option value="title">Title (A–Z)</option>
							</select>
						</div>
					</div>

					{loadError ? (
						<p style={{ color: 'var(--error)', fontSize: 14, margin: 0, fontFamily: 'var(--font)' }}>{loadError}</p>
					) : null}

					{actionError ? (
						<p style={{ color: 'var(--error)', fontSize: 14, margin: 0, fontFamily: 'var(--font)' }} role="alert">
							{actionError}
						</p>
					) : null}

					{enrollments.length === 0 && !loadError ? (
						<div className="empty-state my-courses-page-empty">
							<p style={{ color: 'var(--text-body)', fontFamily: 'var(--font)' }}>No courses yet.</p>
							<Link to="/courses" className="btn-primary">
								Browse Courses
							</Link>
						</div>
					) : (
						<div style={{ display: 'flex', flexDirection: 'column', alignSelf: 'stretch', gap: 24 }}>
							{sorted.map((e) => (
								<EnrollmentRowFigma
									key={e.id ?? e.courseId}
									enrollment={e}
									openMenuCourseId={openMenuCourseId}
									onToggleMenu={(cid) => setOpenMenuCourseId((id) => (id === cid ? null : cid))}
									closeMenu={closeMenu}
									onUnenrolled={load}
									onActionError={setActionError}
								/>
							))}
						</div>
					)}

				</div>
			</main>

			<footer
				style={{
					width: '100%',
					maxWidth: 1280,
					margin: '0 auto',
					marginTop: 'auto',
					padding: '32px 24px',
					background: 'var(--bg-surface)',
					borderTop: '1px solid var(--border)',
					fontFamily: 'var(--font)',
				}}
			>
				<div
					style={{
						width: '100%',
						maxWidth: 1440,
						margin: '0 auto',
						display: 'flex',
						flexWrap: 'wrap',
						justifyContent: 'space-between',
						alignItems: 'center',
						gap: 16,
					}}
				>
					<div style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: '20px' }}>© 2026 Coursly Inc. All rights reserved.</div>
					<div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center' }}>
						<Link to="/" style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: '20px' }}>
							Privacy Policy
						</Link>
						<Link to="/" style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: '20px' }}>
							Terms of Service
						</Link>
						<Link to="/courses" style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: '20px' }}>
							Help Center
						</Link>
					</div>
				</div>
			</footer>
		</div>
	);
};

export default MyCourses;
