import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getCourseById } from '../../api/course.api';
import { checkEnrollment, enrollInCourse } from '../../api/enrollment.api';
import { getCourseProgress } from '../../api/progress.api';
import { showError, showSuccess } from '../../components/Toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';

const normalizePayload = (payload) => payload?.data ?? payload;

const formatDifficulty = (d) => {
	const s = String(d || '').toLowerCase();
	return s ? s.charAt(0).toUpperCase() + s.slice(1) : '—';
};

const formatRelativeUpdated = (iso) => {
	if (!iso) {
		return 'Recently updated';
	}
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) {
		return 'Recently updated';
	}
	const days = Math.floor((Date.now() - d.getTime()) / 86400000);
	if (days < 1) {
		return 'Updated today';
	}
	if (days === 1) {
		return 'Updated 1 day ago';
	}
	return `Updated ${days} days ago`;
};

const getAboutParagraphs = (description) => {
	const text = (description || '').trim();
	if (!text) {
		return [];
	}
	const byBreak = text.split(/\n{2,}/).map((p) => p.trim().replace(/\n/g, ' ')).filter(Boolean);
	if (byBreak.length > 0) {
		return byBreak;
	}
	return [text];
};

const getLearnList = (description, modules) => {
	const lines = (description || '')
		.split(/\n/)
		.map((l) => l.replace(/^[-•*]\s*/, '').trim())
		.filter((l) => l.length > 0 && l.length < 220);
	if (lines.length >= 2) {
		return lines.slice(0, 6);
	}
	const fromModules = (Array.isArray(modules) ? modules : [])
		.map((m) => m?.title)
		.filter(Boolean)
		.slice(0, 5);
	if (fromModules.length > 0) {
		return fromModules;
	}
	return [];
};

const getRequirementsList = (difficulty) => {
	const d = String(difficulty || '').toUpperCase();
	return [
		'Basic computer skills',
		d === 'BEGINNER' ? 'No prior coding experience required' : 'Familiarity with the basics is helpful',
		'A working computer (Windows, Mac, or Linux) with internet access',
	];
};

const getDifficultyBadgeClass = (d) => {
	const level = String(d || '').toUpperCase();
	if (level === 'BEGINNER') {
		return 'badge-beginner';
	}
	if (level === 'INTERMEDIATE') {
		return 'badge-gray';
	}
	if (level === 'ADVANCED') {
		return 'badge-advanced';
	}
	return 'badge-gray';
};

const IconBackArrow = () => (
	<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" style={{ display: 'block' }}>
		<path
			d="M7.5 1.5L3 6L7.5 10.5"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	</svg>
);

const IconDoc = () => (
	<svg width="16" height="20" viewBox="0 0 16 20" fill="none" aria-hidden="true" style={{ display: 'block', color: 'var(--text-primary)' }}>
		<path
			d="M4.5 1.5H9.5L13.5 5.5V16.5C13.5 17.3284 12.8284 18 12 18H4.5C3.67157 18 3 17.3284 3 16.5V3C3 2.17157 3.67157 1.5 4.5 1.5Z"
			stroke="currentColor"
			strokeWidth="1.2"
		/>
		<path d="M8.5 2V5.5H12" stroke="currentColor" strokeWidth="1.2" />
		<line x1="5" y1="10" x2="11" y2="10" stroke="currentColor" strokeWidth="1.1" />
		<line x1="5" y1="12.5" x2="10" y2="12.5" stroke="currentColor" strokeWidth="1.1" />
	</svg>
);

const IconListSyllabus = () => (
	<svg width="18" height="10" viewBox="0 0 18 10" fill="none" aria-hidden="true" style={{ display: 'block', color: 'var(--text-primary)' }}>
		<rect x="0" y="0" width="18" height="2" fill="currentColor" rx="1" />
		<rect x="0" y="4" width="18" height="2" fill="currentColor" rx="1" />
		<rect x="0" y="8" width="12" height="2" fill="currentColor" rx="1" />
	</svg>
);

const IconModuleBox = () => (
	<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" style={{ display: 'block', color: 'var(--text-primary)' }}>
		<rect x="2.5" y="2.5" width="6" height="6" fill="currentColor" opacity="0.2" />
		<rect x="11.5" y="2.5" width="6" height="6" fill="currentColor" />
		<rect x="2.5" y="11.5" width="6" height="6" fill="currentColor" />
		<rect x="11.5" y="11.5" width="6" height="6" fill="currentColor" opacity="0.2" />
	</svg>
);

const IconLecture = () => (
	<svg width="20" height="16" viewBox="0 0 20 16" fill="none" aria-hidden="true" style={{ display: 'block', color: 'var(--text-primary)' }}>
		<rect x="1" y="2" width="18" height="12" stroke="currentColor" strokeWidth="1.2" fill="var(--bg-elevated)" rx="1" />
		<path d="M8 5.5L13 8L8 10.5V5.5Z" fill="currentColor" />
	</svg>
);

const IconClock = () => (
	<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" style={{ display: 'block', color: 'var(--text-primary)' }}>
		<circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
		<path d="M10 5.5V10L12.5 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
	</svg>
);

const IconPlaySmall = () => (
	<svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true" style={{ color: 'var(--text-dim)' }}>
		<path
			d="M4.5 3.25L12.25 7.5L4.5 11.75V3.25Z"
			stroke="currentColor"
			strokeWidth="1.2"
			strokeLinejoin="round"
			fill="none"
		/>
	</svg>
);

const IconChevron = ({ up }) => (
	<svg
		width="12"
		height="8"
		viewBox="0 0 12 8"
		fill="none"
		aria-hidden="true"
		style={{ display: 'block', color: 'var(--text-dim)', transform: up ? 'rotate(180deg)' : 'none' }}
	>
		<path d="M1 1.4L5.3 5.6L9.5 1.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
	</svg>
);

const IconArrowRight = () => (
	<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ color: 'var(--bg-surface)' }}>
		<path
			d="M2.5 7H11.5M11.5 7L7.5 3M11.5 7L7.5 11"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	</svg>
);

const IconBookmark = () => (
	<svg width="12" height="15" viewBox="0 0 12 15" fill="none" aria-hidden="true" style={{ color: 'var(--text-body)' }}>
		<path
			d="M1.5 1.2H10.5V14L6 10.2L1.5 14V1.2Z"
			stroke="currentColor"
			strokeWidth="1.1"
			strokeLinejoin="round"
		/>
	</svg>
);

const IconBarChart = () => (
	<svg width="11" height="12" viewBox="0 0 11 12" fill="none" aria-hidden="true" style={{ color: 'var(--text-secondary)' }}>
		<rect x="1" y="7" width="2" height="4" fill="currentColor" rx="0.5" />
		<rect x="4.5" y="4" width="2" height="7" fill="currentColor" rx="0.5" />
		<rect x="8" y="1" width="2" height="10" fill="currentColor" rx="0.5" />
	</svg>
);

const CheckMark = () => (
	<svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }}>
		<path
			d="M12.5 4L5.5 12L2.5 8.5"
			stroke="var(--success)"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	</svg>
);

function CourseHeroImage({ thumbnailUrl }) {
	const [loadError, setLoadError] = useState(false);
	return (
		<div
			style={{
				width: '100%',
				borderRadius: 'var(--radius-lg)',
				overflow: 'hidden',
				position: 'relative',
				background: 'var(--bg-elevated)',
				boxShadow: 'var(--shadow-elevated)',
			}}
		>
			{loadError || !thumbnailUrl ? (
				<div
					style={{
						width: '100%',
						aspectRatio: '16 / 9',
						background: 'linear-gradient(135deg, var(--accent-badge-bg) 0%, var(--bg-elevated) 100%)',
					}}
				/>
			) : (
				<img
					src={thumbnailUrl}
					alt=""
					style={{ width: '100%', display: 'block', aspectRatio: '16/9', objectFit: 'cover' }}
					onError={() => setLoadError(true)}
				/>
			)}
			<div
				style={{
					pointerEvents: 'none',
					position: 'absolute',
					left: 0,
					right: 0,
					bottom: 0,
					top: 0,
					background: 'linear-gradient(0deg, color-mix(in srgb, var(--text-primary) 40%, transparent) 0%, transparent 100%)',
				}}
			/>
		</div>
	);
}

function CourseSyllabusSection({ modules, updatedAtLabel }) {
	const [openModuleId, setOpenModuleId] = useState(() => modules[0]?.id ?? null);
	const toggleModule = (moduleId) => {
		setOpenModuleId((prev) => (prev === moduleId ? null : moduleId));
	};

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
			<div
				style={{
					display: 'flex',
					flexWrap: 'wrap',
					justifyContent: 'space-between',
					alignItems: 'center',
					gap: 12,
				}}
			>
				<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
					<IconListSyllabus />
					<h2
						style={{
							margin: 0,
							color: 'var(--text-primary)',
							fontSize: 20,
							fontWeight: 700,
							lineHeight: '28px',
							fontFamily: 'var(--font)',
						}}
					>
						Course Syllabus
					</h2>
				</div>
				<div style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 500, lineHeight: '20px' }}>{updatedAtLabel}</div>
			</div>

			{modules.length === 0 ? (
				<div className="empty-state" style={{ minHeight: 160, border: '1px solid var(--border)' }}>
					<p>Syllabus will appear when modules are added.</p>
				</div>
			) : (
				<div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignSelf: 'stretch' }}>
					{modules.map((mod, modIdx) => {
						const lectures = (mod.lectures || []).sort((a, b) => (a.order || 0) - (b.order || 0));
						const n = lectures.length;
						const isOpen = openModuleId === mod.id;
						return (
							<div
								key={mod.id}
								className="card"
								style={{
									padding: 0,
									overflow: 'hidden',
									display: 'flex',
									flexDirection: 'column',
								}}
							>
								<button
									type="button"
									onClick={() => toggleModule(mod.id)}
									style={{
										width: '100%',
										padding: 20,
										margin: 0,
										background: isOpen ? 'var(--bg-surface-alt)' : 'var(--bg-surface)',
										border: 'none',
										borderBottom: isOpen ? '1px solid var(--border)' : 'none',
										cursor: 'pointer',
										display: 'flex',
										justifyContent: 'space-between',
										alignItems: 'center',
										textAlign: 'left',
										fontFamily: 'var(--font)',
									}}
								>
									<div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
										<div
											style={{
												width: 32,
												height: 32,
												background: 'var(--accent-badge-bg)',
												borderRadius: 'var(--radius-pill)',
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												color: 'var(--text-primary)',
												fontSize: 14,
												fontWeight: 700,
											}}
										>
											{modIdx + 1}
										</div>
										<div>
											<div
												style={{
													color: 'var(--text-primary)',
													fontSize: 16,
													fontWeight: 600,
													lineHeight: '24px',
												}}
											>
												{mod.title}
											</div>
											<div style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: '16px' }}>
												{n} {n === 1 ? 'Lecture' : 'Lectures'}
											</div>
										</div>
									</div>
									<IconChevron up={!isOpen} />
								</button>
								{isOpen && (
									<div style={{ borderTop: '1px solid var(--border)' }}>
										{lectures.map((lec, lecIdx) => (
											<div
												key={lec.id}
												style={{
													padding: 16,
													borderBottom: lecIdx < lectures.length - 1 ? '1px solid var(--border-light)' : 'none',
													display: 'flex',
													alignItems: 'flex-start',
													gap: 12,
												}}
											>
												<div style={{ paddingTop: 2, flexShrink: 0 }}>
													<IconPlaySmall />
												</div>
												<div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
													<div
														style={{
															color: 'var(--text-body)',
															fontSize: 14,
															fontWeight: 500,
															lineHeight: '20px',
														}}
													>
														Lecture {modIdx + 1}.{lecIdx + 1}: {lec.title}
													</div>
													{lec.description ? (
														<div
															style={{
																color: 'var(--text-muted)',
																fontSize: 12,
																lineHeight: '16px',
															}}
														>
															{lec.description}
														</div>
													) : null}
												</div>
												<div
													style={{
														padding: '4px 8px',
														background: 'var(--bg-elevated)',
														borderRadius: 'var(--radius-sm)',
														color: 'var(--text-dim)',
														fontSize: 12,
														fontWeight: 500,
														flexShrink: 0,
													}}
												>
													—
												</div>
											</div>
										))}
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}

const CourseDetail = () => {
	const { id } = useParams();
	const navigate = useNavigate();
	const { user, isAuthenticated, isInstructor } = useAuth();
	const isStudent = isAuthenticated && String(user?.role || '').toUpperCase() === 'STUDENT';

	const courseId = parseInt(id, 10);

	const [course, setCourse] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [loadError, setLoadError] = useState('');
	const [isEnrolled, setIsEnrolled] = useState(false);
	const [progress, setProgress] = useState(null);
	const [isEnrolling, setIsEnrolling] = useState(false);
	const [metaError, setMetaError] = useState('');

	const isOwner = Boolean(
		course && isInstructor && user && course.instructorId != null && user.id === course.instructorId
	);

	const load = useCallback(async () => {
		if (!Number.isFinite(courseId) || courseId < 1) {
			setLoadError('Invalid course.');
			setCourse(null);
			setIsEnrolled(false);
			setProgress(null);
			setIsLoading(false);
			return;
		}
		setIsLoading(true);
		setLoadError('');
		setMetaError('');
		try {
			const res = await getCourseById(courseId);
			const c = normalizePayload(res);
			setCourse(c);

			if (isAuthenticated && isStudent) {
				try {
					const en = await checkEnrollment(courseId);
					const payload = normalizePayload(en);
					const enrolled = Boolean(payload?.enrolled);
					setIsEnrolled(enrolled);
					if (enrolled) {
						try {
							const pRes = await getCourseProgress(courseId);
							setProgress(normalizePayload(pRes));
						} catch (e) {
							setMetaError(String(e));
							setProgress(null);
						}
					} else {
						setProgress(null);
					}
				} catch (e) {
					setMetaError(String(e));
					setIsEnrolled(false);
					setProgress(null);
				}
			} else {
				setIsEnrolled(false);
				setProgress(null);
			}
		} catch (e) {
			setLoadError(String(e));
			setCourse(null);
		} finally {
			setIsLoading(false);
		}
	}, [courseId, isAuthenticated, isStudent]);

	useEffect(() => {
		queueMicrotask(() => {
			void load();
		});
	}, [load]);

	const modules = useMemo(() => {
		if (!course?.modules) {
			return [];
		}
		return [...course.modules].sort((a, b) => (a.order || 0) - (b.order || 0));
	}, [course]);

	const totalLectures = useMemo(
		() => modules.reduce((n, m) => n + (Array.isArray(m.lectures) ? m.lectures.length : 0), 0),
		[modules]
	);

	const aboutParagraphs = useMemo(() => getAboutParagraphs(course?.description), [course?.description]);
	const learnList = useMemo(
		() => getLearnList(course?.description, modules),
		[course?.description, modules]
	);
	const requirementsList = useMemo(() => getRequirementsList(course?.difficulty), [course?.difficulty]);

	const handleEnroll = async () => {
		if (!isStudent) {
			navigate(`/login?returnTo=/courses/${courseId}`);
			return;
		}
		setIsEnrolling(true);
		try {
			await enrollInCourse(courseId);
			showSuccess('You are now enrolled in this course.');
			navigate('/my-courses');
		} catch (e) {
			showError(String(e));
		} finally {
			setIsEnrolling(false);
		}
	};

	const syllabusUpdatedLabel = course ? formatRelativeUpdated(course.updatedAt) : '';

	const handleSaveForLater = () => {
		const key = `savedCourseIds`;
		try {
			const raw = localStorage.getItem(key);
			const set = new Set(raw ? JSON.parse(raw) : []);
			set.add(courseId);
			localStorage.setItem(key, JSON.stringify([...set]));
			showSuccess('Course saved to your list.');
		} catch {
			localStorage.setItem(key, JSON.stringify([courseId]));
			showSuccess('Course saved to your list.');
		}
	};

	if (isLoading) {
		return <LoadingSpinner fullPage />;
	}

	if (loadError || !course) {
		return (
			<main className="page-fade" style={{ width: '100%', maxWidth: 800, margin: '0 auto', padding: 48, fontFamily: 'var(--font)' }}>
				<h1 style={{ color: 'var(--text-primary)', fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Unable to load course</h1>
				<p style={{ color: 'var(--error)', marginBottom: 20 }}>{loadError || 'This course is unavailable or has been removed.'}</p>
				<Link to="/courses" className="btn-secondary" style={{ display: 'inline-flex' }}>
					Back to catalog
				</Link>
			</main>
		);
	}

	const instName = course.instructor?.name || '—';
	const pct = typeof progress?.percentage === 'number' ? progress.percentage : 0;

	return (
		<main
			className="page-fade"
			style={{
				width: '100%',
				maxWidth: 1280,
				minHeight: 800,
				margin: '0 auto',
				padding: '32px 32px 38px',
				background: 'var(--bg-primary)',
				fontFamily: 'var(--font)',
				color: 'var(--text-body)',
				display: 'flex',
				flexDirection: 'column',
				gap: 32,
			}}
		>
			<Link
				to="/courses"
				style={{
					display: 'inline-flex',
					alignItems: 'center',
					gap: 8,
					color: 'var(--text-primary)',
					fontSize: 14,
					fontWeight: 500,
					lineHeight: '20px',
					fontFamily: 'var(--font)',
				}}
			>
				<span style={{ color: 'var(--text-primary)', display: 'flex' }}>
					<IconBackArrow />
				</span>
				Back to Catalog
			</Link>

			<div
				style={{
					alignSelf: 'stretch',
					display: 'flex',
					flexWrap: 'wrap',
					justifyContent: 'center',
					alignItems: 'flex-start',
					gap: 40,
				}}
			>
				<div
					style={{
						width: 483,
						maxWidth: '100%',
						flex: '0 1 420px',
						display: 'flex',
						flexDirection: 'column',
					}}
				>
					<CourseHeroImage key={courseId} thumbnailUrl={course.thumbnailUrl} />
				</div>

				<div
					style={{
						flex: '1 1 400px',
						maxWidth: 700,
						display: 'flex',
						flexDirection: 'column',
						justifyContent: 'center',
						alignItems: 'flex-start',
					}}
				>
					<div style={{ alignSelf: 'stretch', paddingBottom: 16, display: 'flex', flexDirection: 'column' }}>
						<div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
							{course.category ? <span className="badge badge-blue">{course.category}</span> : null}
							<div
								className={`badge ${getDifficultyBadgeClass(course.difficulty)}`}
								style={{ display: 'inline-flex', alignItems: 'center', gap: 4, textTransform: 'none', letterSpacing: 0, fontSize: 12, fontWeight: 500, padding: '4px 12px' }}
							>
								<IconBarChart />
								{formatDifficulty(course.difficulty)}
							</div>
						</div>
					</div>

					<div style={{ alignSelf: 'stretch', paddingBottom: 16 }}>
						<h1
							style={{
								margin: 0,
								color: 'var(--text-primary)',
								fontSize: 36,
								fontWeight: 700,
								lineHeight: '40px',
								fontFamily: 'var(--font)',
							}}
						>
							{course.title}
						</h1>
					</div>

					<div style={{ alignSelf: 'stretch', paddingBottom: 24 }}>
						<div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
							<div
								style={{
									width: 32,
									height: 32,
									borderRadius: 'var(--radius-pill)',
									overflow: 'hidden',
									background: 'var(--bg-elevated)',
									color: 'var(--text-primary)',
									fontSize: 12,
									fontWeight: 600,
									display: 'grid',
									placeItems: 'center',
									fontFamily: 'var(--font)',
								}}
							>
								{instName
									.split(' ')
									.map((n) => n[0])
									.join('')
									.slice(0, 2)
									.toUpperCase() || '—'}
							</div>
							<div>
								<span style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500, fontFamily: 'var(--font)' }}>
									Instructor:{' '}
								</span>
								<span style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 400, fontFamily: 'var(--font)' }}>{instName}</span>
							</div>
						</div>
					</div>

					<div style={{ alignSelf: 'stretch', paddingBottom: 32, display: 'flex', flexDirection: 'column' }}>
						<div
							style={{
								alignSelf: 'stretch',
								display: 'flex',
								flexWrap: 'wrap',
								alignItems: 'center',
								gap: 24,
							}}
						>
							<StatPill
								label="MODULES"
								value={String(modules.length)}
								icon={<IconModuleBox />}
							/>
							<div
								style={{
									width: 1,
									height: 40,
									background: 'var(--border)',
									flex: '0 0 auto',
								}}
							/>
							<StatPill
								label="LECTURES"
								value={String(totalLectures)}
								icon={<IconLecture />}
							/>
							<div style={{ width: 1, height: 40, background: 'var(--border)' }} />
							<StatPill label="DURATION" value="Self-paced" icon={<IconClock />} />
						</div>
					</div>

					{metaError ? (
						<p style={{ color: 'var(--error)', fontSize: 14, marginBottom: 8 }}>{metaError}</p>
					) : null}

					{isInstructor ? (
						isOwner ? (
							<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
								<p
									style={{
										color: 'var(--text-secondary)',
										fontSize: 16,
										fontWeight: 600,
										fontFamily: 'var(--font)',
										margin: 0,
									}}
								>
									Instructor View
								</p>
								<Link to={`/instructor/courses/${courseId}/build`} style={{ color: 'var(--accent)', fontSize: 14, fontWeight: 500 }}>
									Open course editor
								</Link>
							</div>
						) : (
							<p
								style={{
									color: 'var(--text-secondary)',
									fontSize: 16,
									fontWeight: 600,
									fontFamily: 'var(--font)',
									margin: 0,
								}}
							>
								Instructor View
							</p>
						)
					) : isStudent && isEnrolled ? (
						<div style={{ alignSelf: 'stretch', maxWidth: 480 }}>
							<Link
								to={`/learn/${courseId}`}
								className="btn-primary"
								style={{ textDecoration: 'none', display: 'inline-flex', width: 'fit-content' }}
							>
								Continue Learning
								<IconArrowRight />
							</Link>
							{progress ? (
								<div style={{ marginTop: 16, width: '100%' }}>
									<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: 'var(--text-muted)' }}>
										<span>Your progress</span>
										<span style={{ color: 'var(--text-body)', fontWeight: 600 }}>{Math.round(pct)}%</span>
									</div>
									<div className="progress-bar">
										<div className="progress-fill" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
									</div>
								</div>
							) : null}
						</div>
					) : (
						<div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
							{isStudent ? (
								<button type="button" className="btn-primary" onClick={handleEnroll} disabled={isEnrolling}>
									{isEnrolling ? 'Enrolling…' : 'Enroll Now'}
									<IconArrowRight />
								</button>
							) : (
								<button
									type="button"
									className="btn-primary"
									onClick={() => navigate(`/login?returnTo=${encodeURIComponent(`/courses/${courseId}`)}`)}
								>
									Login to Enroll
									<IconArrowRight />
								</button>
							)}
							<button type="button" className="btn-secondary" onClick={handleSaveForLater}>
								<IconBookmark />
								Save for later
							</button>
						</div>
					)}
				</div>
			</div>

			<div
				style={{
					alignSelf: 'stretch',
					paddingTop: 16,
					display: 'flex',
					flexWrap: 'wrap',
					justifyContent: 'center',
					alignItems: 'flex-start',
					gap: 48,
				}}
			>
				<div
					style={{
						flex: '1 1 520px',
						maxWidth: 795,
						display: 'flex',
						flexDirection: 'column',
						gap: 48,
					}}
				>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
						<div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
							<IconDoc />
							<h2
								style={{
									margin: 0,
									color: 'var(--text-primary)',
									fontSize: 20,
									fontWeight: 700,
									lineHeight: '28px',
									fontFamily: 'var(--font)',
								}}
							>
								About This Course
							</h2>
						</div>
						{aboutParagraphs.length === 0 ? (
							<p style={{ color: 'var(--text-secondary)', lineHeight: '26px', fontSize: 16 }}>No description provided yet.</p>
						) : (
							aboutParagraphs.map((p, i) => (
								<p key={i} style={{ color: 'var(--text-secondary)', lineHeight: '26px', fontSize: 16, margin: 0, fontFamily: 'var(--font)' }}>
									{p}
								</p>
							))
						)}
					</div>

					<CourseSyllabusSection
						key={course.id}
						modules={modules}
						updatedAtLabel={syllabusUpdatedLabel}
					/>
				</div>

				<aside
					style={{
						width: 373,
						maxWidth: '100%',
						flex: '0 1 360px',
						display: 'flex',
						flexDirection: 'column',
						gap: 24,
					}}
				>
					<div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 24 }}>
						<h3
							style={{
								margin: 0,
								color: 'var(--text-primary)',
								fontSize: 16,
								fontWeight: 700,
								lineHeight: '24px',
								fontFamily: 'var(--font)',
							}}
						>
							What you&apos;ll learn
						</h3>
						{learnList.length === 0 ? (
							<p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: '20px', margin: 0 }}>
								Outcomes will be reflected in the module titles and description.
							</p>
						) : (
							<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
								{learnList.map((line, i) => (
									<div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
										<CheckMark />
										<div style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: '20px', fontFamily: 'var(--font)' }}>{line}</div>
									</div>
								))}
							</div>
						)}
					</div>

					<div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 24 }}>
						<h3
							style={{
								margin: 0,
								color: 'var(--text-primary)',
								fontSize: 16,
								fontWeight: 700,
								lineHeight: '24px',
								fontFamily: 'var(--font)',
							}}
						>
							Requirements
						</h3>
						<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
							{requirementsList.map((req, i) => (
								<div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
									<div style={{ color: 'var(--text-secondary)', fontSize: 14, flexShrink: 0 }}>•</div>
									<div style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: '20px', fontFamily: 'var(--font)' }}>{req}</div>
								</div>
							))}
						</div>
					</div>
				</aside>
			</div>
		</main>
	);
};

function StatPill({ label, value, icon }) {
	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: 8,
			}}
		>
			<div
				style={{
					padding: 8,
					background: 'var(--bg-elevated)',
					borderRadius: 'var(--radius)',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
				}}
			>
				{icon}
			</div>
			<div>
				<div
					style={{
						color: 'var(--text-muted)',
						fontSize: 12,
						fontWeight: 600,
						textTransform: 'uppercase',
						lineHeight: '16px',
						fontFamily: 'var(--font)',
					}}
				>
					{label}
				</div>
				<div
					style={{
						color: 'var(--text-body)',
						fontSize: 18,
						fontWeight: 700,
						lineHeight: '18px',
						fontFamily: 'var(--font)',
					}}
				>
					{value}
				</div>
			</div>
		</div>
	);
}

export default CourseDetail;
