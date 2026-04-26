import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getCourseById } from '../../api/course.api';
import { getQuizById } from '../../api/quiz.api';
import {
	getCourseProgress,
	getCourseProgressDetails,
	getNextIncompleteLecture,
	markLectureComplete,
} from '../../api/progress.api';
import { getMyAttempts } from '../../api/quiz.api';
import { checkCompletion } from '../../api/certificate.api';
import { showError, showSuccess } from '../../components/Toast';
import LoadingSpinner from '../../components/LoadingSpinner';

const normalizePayload = (payload) => payload?.data ?? payload;

const font = { fontFamily: 'var(--font)' };

function toYouTubeEmbedUrl(url) {
	if (!url || typeof url !== 'string') {
		return '';
	}
	const u = url.trim();
	if (u.includes('youtube.com/embed/')) {
		return u.split('?')[0];
	}
	if (!/youtube\.com|youtu\.be/i.test(u)) {
		return '';
	}
	try {
		const parsed = new URL(u);
		if (parsed.hostname === 'youtu.be') {
			const id = parsed.pathname.replace(/^\//, '').split('/')[0];
			return id ? `https://www.youtube.com/embed/${id}` : '';
		}
		if (parsed.hostname.includes('youtube.com')) {
			const v = parsed.searchParams.get('v');
			if (v) {
				return `https://www.youtube.com/embed/${v}`;
			}
			const m = parsed.pathname.match(/\/(embed|live|v)\/([^/?]+)/);
			if (m) {
				return `https://www.youtube.com/embed/${m[2]}`;
			}
		}
	} catch {
		return '';
	}
	return '';
}

function isYouTubeUrl(url) {
	return Boolean(url && /youtube\.com|youtu\.be/i.test(String(url)));
}

function findLectureInCourse(course, lectureId) {
	if (!course?.modules || !lectureId) {
		return null;
	}
	for (const m of course.modules) {
		const lec = (m.lectures || []).find((l) => l.id === lectureId);
		if (lec) {
			return { lecture: lec, module: m };
		}
	}
	return null;
}

function getFirstLecture(course) {
	const modules = [...(course?.modules || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
	for (const m of modules) {
		const lecs = [...(m.lectures || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
		if (lecs.length) {
			return { lecture: lecs[0], module: m };
		}
	}
	return null;
}

function getResourceLabel(fileUrl) {
	if (!fileUrl) {
		return { title: 'File', sub: 'Download' };
	}
	if (/^https?:\/\//i.test(fileUrl) && !/\/uploads\//i.test(fileUrl)) {
		return { title: 'External', sub: 'External Link' };
	}
	const lower = fileUrl.toLowerCase();
	if (lower.endsWith('.zip')) {
		return { title: 'ZIP', sub: 'Download' };
	}
	if (lower.endsWith('.pdf')) {
		return { title: 'PDF', sub: 'Download' };
	}
	return { title: 'File', sub: 'Download' };
}

const CoursePlayer = () => {
	const { courseId: courseIdParam } = useParams();
	const navigate = useNavigate();
	const courseId = parseInt(courseIdParam, 10);

	const [course, setCourse] = useState(null);
	const [progressDetails, setProgressDetails] = useState([]);
	const [overallProgress, setOverallProgress] = useState(null);
	const [activeLectureId, setActiveLectureId] = useState(null);
	const [activeQuizId, setActiveQuizId] = useState(null);
	const [previewQuiz, setPreviewQuiz] = useState(null);
	const [previewAttempts, setPreviewAttempts] = useState([]);
	const [previewQuizLoading, setPreviewQuizLoading] = useState(false);
	const [previewQuizError, setPreviewQuizError] = useState('');
	const [expandedModuleIds, setExpandedModuleIds] = useState(() => new Set());
	const [quizPassed, setQuizPassed] = useState({});
	const [isLoading, setIsLoading] = useState(true);
	const [loadError, setLoadError] = useState('');
	const [progressError, setProgressError] = useState('');
	const [markError, setMarkError] = useState('');
	const [isMarking, setIsMarking] = useState(false);
	const [showCertBanner, setShowCertBanner] = useState(false);
	const [courseFullyComplete, setCourseFullyComplete] = useState(false);

	const sortedModules = useMemo(() => {
		if (!course?.modules) {
			return [];
		}
		return [...course.modules].sort((a, b) => (a.order || 0) - (b.order || 0));
	}, [course]);

	const totalLectures = useMemo(
		() => sortedModules.reduce((n, m) => n + (Array.isArray(m.lectures) ? m.lectures.length : 0), 0),
		[sortedModules]
	);

	const totalModules = sortedModules.length;

	const activeLectureInfo = useMemo(
		() => (course && activeLectureId ? findLectureInCourse(course, activeLectureId) : null),
		[course, activeLectureId]
	);

	const activeLecture = activeLectureInfo?.lecture || null;

	const moduleForActiveQuiz = useMemo(() => {
		if (!activeQuizId || !course) {
			return null;
		}
		return sortedModules.find((m) => m.quiz?.id === activeQuizId) || null;
	}, [activeQuizId, course, sortedModules]);

	const activeModule = activeLectureInfo?.module || moduleForActiveQuiz;

	const activeModuleIndex = useMemo(() => {
		if (!activeModule) {
			return 0;
		}
		return sortedModules.findIndex((m) => m.id === activeModule.id);
	}, [activeModule, sortedModules]);

	const isLectureComplete = useCallback(
		(lectureId) => {
			const row = (progressDetails || []).find((p) => p.lectureId === lectureId);
			return Boolean(row?.isComplete);
		},
		[progressDetails]
	);

	const loadAll = useCallback(async () => {
		if (!Number.isFinite(courseId) || courseId < 1) {
			setLoadError('Invalid course.');
			setCourse(null);
			setIsLoading(false);
			return;
		}
		setIsLoading(true);
		setLoadError('');
		setProgressError('');
		setMarkError('');
		setShowCertBanner(false);
		setCourseFullyComplete(false);
		try {
			const cRes = await getCourseById(courseId);
			const c = normalizePayload(cRes);
			setCourse(c);
			const mods = [...(c?.modules || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
			const first = getFirstLecture(c);

			let details = [];
			try {
				const dRes = await getCourseProgressDetails(courseId);
				details = normalizePayload(dRes) || [];
				if (!Array.isArray(details)) {
					details = [];
				}
			} catch (e) {
				setProgressError(String(e));
			}
			setProgressDetails(details);

			let progress = null;
			try {
				const pRes = await getCourseProgress(courseId);
				progress = normalizePayload(pRes);
			} catch (e) {
				if (!details.length) {
					setProgressError((prev) => prev || String(e));
				}
			}
			setOverallProgress(progress);
			if (progress?.totalLectures > 0 && progress.completedLectures >= progress.totalLectures) {
				setShowCertBanner(true);
			}

			try {
				const chkRes = await checkCompletion(courseId);
				const chk = normalizePayload(chkRes);
				setCourseFullyComplete(Boolean(chk?.completed));
			} catch {
				setCourseFullyComplete(false);
			}

			let nextLectureId = null;
			try {
				const nRes = await getNextIncompleteLecture(courseId);
				const n = normalizePayload(nRes);
				const nextLec = n?.lecture ?? n;
				if (nextLec?.id) {
					nextLectureId = nextLec.id;
				}
			} catch {
				// optional
			}
			if (nextLectureId) {
				setActiveLectureId(nextLectureId);
				setActiveQuizId(null);
			} else if (first?.lecture) {
				setActiveLectureId(first.lecture.id);
				setActiveQuizId(null);
			} else {
				setActiveLectureId(null);
				setActiveQuizId(null);
			}
			if (nextLectureId) {
				const found = findLectureInCourse(c, nextLectureId);
				if (found?.module) {
					setExpandedModuleIds(new Set([found.module.id]));
				}
			} else if (first?.module) {
				setExpandedModuleIds(new Set([first.module.id]));
			} else {
				const initial = mods.length ? new Set([mods[0].id]) : new Set();
				setExpandedModuleIds(initial);
			}
		} catch (e) {
			setLoadError(String(e));
			setCourse(null);
		} finally {
			setIsLoading(false);
		}
	}, [courseId]);

	useEffect(() => {
		void loadAll();
	}, [loadAll]);

	useEffect(() => {
		if (!activeQuizId) {
			setPreviewQuiz(null);
			setPreviewAttempts([]);
			setPreviewQuizError('');
			setPreviewQuizLoading(false);
			return;
		}
		let cancelled = false;
		setPreviewQuizLoading(true);
		setPreviewQuizError('');
		(async () => {
			try {
				const qRes = await getQuizById(activeQuizId);
				const q = normalizePayload(qRes);
				if (!cancelled) {
					setPreviewQuiz(q);
				}
				const aRes = await getMyAttempts(activeQuizId);
				const list = normalizePayload(aRes);
				if (!cancelled) {
					setPreviewAttempts(Array.isArray(list) ? list : []);
				}
			} catch (e) {
				if (!cancelled) {
					setPreviewQuizError(String(e));
					setPreviewQuiz(null);
					setPreviewAttempts([]);
				}
			} finally {
				if (!cancelled) {
					setPreviewQuizLoading(false);
				}
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [activeQuizId]);

	useEffect(() => {
		if (!course?.modules) {
			return;
		}
		let cancelled = false;
		const run = async () => {
			const byId = {};
			const quizIds = course.modules
				.map((m) => m.quiz)
				.filter((q) => q && q.isPublished)
				.map((q) => q.id);
			await Promise.all(
				quizIds.map(async (qid) => {
					try {
						const r = await getMyAttempts(qid);
						const arr = normalizePayload(r);
						const list = Array.isArray(arr) ? arr : [];
						byId[qid] = list.some((a) => a.passed);
					} catch {
						byId[qid] = false;
					}
				})
			);
			if (!cancelled) {
				setQuizPassed(byId);
			}
		};
		void run();
		return () => {
			cancelled = true;
		};
	}, [course]);

	const toggleModule = (id) => {
		setExpandedModuleIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	const courseTitleShort = (course?.title || '').length > 28 ? `${(course?.title || '').slice(0, 28)}…` : (course?.title || '');

	const pct = overallProgress?.percentage != null ? Math.min(100, Math.max(0, overallProgress.percentage)) : 0;
	const completedN = overallProgress?.completedLectures ?? 0;

	const handleMarkComplete = async () => {
		if (!activeLectureId || !activeLecture) {
			return;
		}
		if (isLectureComplete(activeLectureId)) {
			return;
		}
		setIsMarking(true);
		setMarkError('');
		try {
			await markLectureComplete(activeLectureId, true);
			const dRes = await getCourseProgressDetails(courseId);
			const details = normalizePayload(dRes) || [];
			setProgressDetails(Array.isArray(details) ? details : []);
			const pRes = await getCourseProgress(courseId);
			const p = normalizePayload(pRes);
			setOverallProgress(p);
			showSuccess('Lecture marked complete.');
			if (p?.totalLectures > 0 && p.completedLectures >= p.totalLectures) {
				setShowCertBanner(true);
			}
			try {
				const chkRes = await checkCompletion(courseId);
				const chk = normalizePayload(chkRes);
				setCourseFullyComplete(Boolean(chk?.completed));
			} catch {
				setCourseFullyComplete(false);
			}
		} catch (e) {
			setMarkError(String(e));
			showError(String(e));
		} finally {
			setIsMarking(false);
		}
	};

	const videoEmbed = activeLecture?.videoUrl ? toYouTubeEmbedUrl(activeLecture.videoUrl) : '';
	const showYt = Boolean(activeLecture?.videoUrl && isYouTubeUrl(activeLecture.videoUrl) && videoEmbed);

	if (isLoading) {
		return <LoadingSpinner fullPage />;
	}

	if (loadError || !course) {
		return (
			<main className="page-fade" style={{ ...font, minHeight: '100vh', padding: 48, background: 'var(--bg-primary)' }}>
				<h1 style={{ color: 'var(--text-primary)', fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Unable to load course</h1>
				<p style={{ color: 'var(--error)', marginBottom: 20 }}>{loadError || 'This course is unavailable or has been removed.'}</p>
				<Link to="/my-courses" className="btn-secondary" style={{ display: 'inline-flex' }}>
					Back to my courses
				</Link>
			</main>
		);
	}

	return (
		<div
			className="page-fade"
			style={{
				width: '100%',
				height: 'calc(100vh - 64px)',
				maxHeight: 'calc(100vh - 64px)',
				background: 'var(--bg-primary)',
				display: 'flex',
				flexDirection: 'column',
				overflow: 'hidden',
				...font,
			}}
		>
			<header
				style={{
					display: 'flex',
					height: 64,
					paddingLeft: 24,
					paddingRight: 24,
					background: 'var(--bg-surface)',
					borderBottom: '1px solid var(--border)',
					justifyContent: 'space-between',
					alignItems: 'center',
					flexShrink: 0,
				}}
			>
				<Link
					to="/my-courses"
					style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'var(--text-primary)' }}
				>
					<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden style={{ color: 'var(--text-primary)' }}>
						<path
							fill="currentColor"
							d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"
						/>
					</svg>
					<span style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, lineHeight: '20px', letterSpacing: '0.35px' }}>Back to Dashboard</span>
				</Link>
				<div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
					<div
						title={course.title}
						style={{
							color: 'var(--text-secondary)',
							fontSize: 14,
							fontWeight: 500,
							lineHeight: '20px',
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							whiteSpace: 'nowrap',
							maxWidth: 220,
						}}
					>
						{courseTitleShort || 'Course'}
					</div>
					<div style={{ width: 1, height: 16, background: 'var(--text-dim)', flexShrink: 0 }} />
					<div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 700, lineHeight: '20px', whiteSpace: 'nowrap' }}>
						{activeModule
							? activeQuizId
								? `Module ${activeModuleIndex + 1} Quiz`
								: `Module ${activeModuleIndex + 1}`
							: '—'}
					</div>
				</div>
			</header>

			<div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
				<aside
					style={{
						width: 320,
						flexShrink: 0,
						background: 'var(--bg-surface)',
						borderRight: '1px solid var(--border)',
						display: 'flex',
						flexDirection: 'column',
						overflow: 'hidden',
					}}
				>
					<div style={{ padding: 20, borderBottom: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: 4 }}>
						<div
							title={course.title}
							style={{
								color: 'var(--text-primary)',
								fontSize: 16,
								fontWeight: 700,
								lineHeight: '24px',
								overflow: 'hidden',
								textOverflow: 'ellipsis',
								display: '-webkit-box',
								WebkitLineClamp: 2,
								WebkitBoxOrient: 'vertical',
							}}
						>
							{course.title}
						</div>
						<div className="progress-bar" style={{ width: '100%', height: 8, background: 'var(--border)', borderRadius: 'var(--radius-pill)', marginTop: 4 }}>
							<div
								className="progress-fill"
								style={{
									width: `${pct}%`,
									height: '100%',
									borderRadius: 'var(--radius-pill)',
									background: 'var(--text-primary)',
								}}
							/>
						</div>
						<div style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: '16px', marginTop: 2 }}>
							{completedN} of {totalLectures} lectures complete
						</div>
						{progressError ? <div style={{ color: 'var(--error)', fontSize: 12, marginTop: 4 }}>{progressError}</div> : null}
					</div>

					<div
						style={{
							flex: 1,
							minHeight: 0,
							overflowY: 'auto',
							overscrollBehavior: 'contain',
							display: 'flex',
							flexDirection: 'column',
						}}
					>
						<div style={{ padding: '16px 20px 8px' }}>
							<div style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 700, lineHeight: '28px' }}>Course Syllabus</div>
							<div style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: '16px' }}>
								{totalModules} {totalModules === 1 ? 'Module' : 'Modules'} · {totalLectures} {totalLectures === 1 ? 'Lecture' : 'Lectures'}
							</div>
						</div>

						{sortedModules.map((module, modIdx) => {
							const isOpen = expandedModuleIds.has(module.id);
							const lecs = [...(module.lectures || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
							const publishedQuiz = module.quiz?.isPublished ? module.quiz : null;
							const quizPassedState = publishedQuiz ? Boolean(quizPassed[publishedQuiz.id]) : false;
							const quizIsActive = Boolean(publishedQuiz && activeQuizId === publishedQuiz.id);
							return (
								<div key={module.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
									<button
										type="button"
										onClick={() => toggleModule(module.id)}
										style={{
											width: '100%',
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'space-between',
											padding: '16px 20px',
											background: isOpen ? 'var(--bg-surface-alt)' : 'transparent',
											border: 'none',
											cursor: 'pointer',
											textAlign: 'left',
										}}
									>
										<span style={{ color: isOpen ? 'var(--text-primary)' : 'var(--text-body)', fontSize: 16, fontWeight: 600, lineHeight: '24px' }}>
											{`Module ${modIdx + 1}: ${module.title}`}
										</span>
										<svg
											width="12"
											height="12"
											viewBox="0 0 24 24"
											style={{ color: 'var(--text-dim)', transform: isOpen ? 'rotate(180deg)' : 'none' }}
										>
											<path fill="currentColor" d="M7 10l5 5 5-5H7z" />
										</svg>
									</button>
									{isOpen ? (
										<div style={{ paddingTop: 4, paddingBottom: 4 }}>
											{lecs.map((lec) => {
												const isActive = lec.id === activeLectureId;
												const done = isLectureComplete(lec.id);
												const lecIndex = lecs.findIndex((l) => l.id === lec.id);
												const label = `${modIdx + 1}.${lecIndex + 1} – ${lec.title}`;
												return (
													<button
														type="button"
														key={lec.id}
														onClick={() => {
															setActiveLectureId(lec.id);
															setActiveQuizId(null);
															setMarkError('');
														}}
														style={{
															width: '100%',
															border: 'none',
															background: isActive
																? 'color-mix(in srgb, var(--text-primary) 6%, var(--bg-surface))'
																: 'transparent',
															borderRight: isActive ? '4px solid var(--text-primary)' : '4px solid transparent',
															padding: '12px 20px',
															display: 'flex',
															alignItems: 'flex-start',
															gap: 12,
															cursor: 'pointer',
															textAlign: 'left',
														}}
													>
														<div style={{ width: 20, height: 22, paddingTop: 2, flexShrink: 0 }}>
															{done ? (
																<div
																	style={{
																		width: 20,
																		height: 20,
																		borderRadius: '50%',
																		background: 'var(--text-primary)',
																		display: 'flex',
																		alignItems: 'center',
																		justifyContent: 'center',
																	}}
																	aria-hidden
																>
																	<svg width="12" height="10" viewBox="0 0 12 10" style={{ color: 'var(--bg-surface)' }}>
																		<path
																			fill="currentColor"
																			d="M1.5 5.2l2.3 2.1L10.1 0.5 11.5 2 3.5 9.2 0 5.2l1.5-1.2z"
																		/>
																	</svg>
																</div>
															) : isActive ? (
																	<div
																		style={{
																			width: 20,
																			height: 20,
																			borderRadius: '50%',
																			background: 'var(--text-primary)',
																			display: 'flex',
																			alignItems: 'center',
																			justifyContent: 'center',
																		}}
																		aria-hidden
																	>
																		<svg width="7" height="9" viewBox="0 0 7 9" style={{ color: 'var(--bg-surface)' }}>
																			<path fill="currentColor" d="M0 0v9l7-4.5L0 0z" />
																		</svg>
																	</div>
															) : (
																<div
																	style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid var(--text-dim)' }}
																	aria-hidden
																/>
															)}
														</div>
														<div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
															<div
																style={{
																	color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
																	fontSize: 14,
																	fontWeight: isActive ? 700 : 500,
																	lineHeight: '20px',
																	wordBreak: 'break-word',
																}}
															>
																{label}
															</div>
														</div>
													</button>
												);
											})}
											{publishedQuiz ? (
												<button
													type="button"
													onClick={() => {
														setActiveQuizId(publishedQuiz.id);
														setActiveLectureId(null);
														setMarkError('');
													}}
													style={{
														width: '100%',
														display: 'flex',
														alignItems: 'flex-start',
														gap: 12,
														padding: '12px 20px',
														border: 'none',
														background: quizIsActive
															? 'color-mix(in srgb, var(--text-primary) 6%, var(--bg-surface))'
															: 'transparent',
														borderRight: quizIsActive ? '4px solid var(--text-primary)' : '4px solid transparent',
														cursor: 'pointer',
														textAlign: 'left',
													}}
												>
													<div style={{ width: 20, height: 22, paddingTop: 2, flexShrink: 0 }}>
														{quizPassedState ? (
															<div
																style={{
																	width: 20,
																	height: 20,
																	borderRadius: '50%',
																	background: 'var(--text-primary)',
																	display: 'flex',
																	alignItems: 'center',
																	justifyContent: 'center',
																}}
																aria-hidden
															>
																<svg width="12" height="10" viewBox="0 0 12 10" style={{ color: 'var(--bg-surface)' }}>
																	<path
																		fill="currentColor"
																		d="M1.5 5.2l2.3 2.1L10.1 0.5 11.5 2 3.5 9.2 0 5.2l1.5-1.2z"
																	/>
																</svg>
															</div>
														) : quizIsActive ? (
															<div
																style={{
																	width: 20,
																	height: 20,
																	borderRadius: '50%',
																	background: 'var(--text-primary)',
																	display: 'flex',
																	alignItems: 'center',
																	justifyContent: 'center',
																}}
																aria-hidden
															>
																<svg width="7" height="9" viewBox="0 0 7 9" style={{ color: 'var(--bg-surface)' }}>
																	<path fill="currentColor" d="M0 0v9l7-4.5L0 0z" />
																</svg>
															</div>
														) : (
															<div
																style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid var(--text-dim)' }}
																aria-hidden
															/>
														)}
													</div>
													<div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
														<div
															style={{
																color: quizIsActive ? 'var(--text-primary)' : 'var(--text-secondary)',
																fontSize: 14,
																fontWeight: quizIsActive ? 700 : 500,
																lineHeight: '20px',
																wordBreak: 'break-word',
															}}
														>
															{publishedQuiz.title}
														</div>
													</div>
												</button>
											) : null}
										</div>
									) : null}
								</div>
							);
						})}
					</div>
				</aside>

				<main
					style={{
						flex: 1,
						minHeight: 0,
						background: 'var(--bg-primary)',
						overflowY: 'auto',
						overscrollBehavior: 'contain',
						display: 'flex',
						flexDirection: 'column',
						minWidth: 0,
					}}
				>
					{activeQuizId ? (
						<div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
							{previewQuizLoading ? (
								<div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
									<div className="spinner" />
								</div>
							) : previewQuizError ? (
								<div style={{ padding: 32 }}>
									<p style={{ color: 'var(--error)', fontSize: 14 }}>{previewQuizError}</p>
								</div>
							) : previewQuiz && !previewQuiz.isPublished ? (
								<div style={{ padding: 32 }}>
									<p style={{ color: 'var(--text-muted)', fontSize: 16 }}>This quiz is not available yet.</p>
								</div>
							) : previewQuiz ? (
								<CourseQuizPreview
									courseId={courseId}
									moduleIndex={activeModuleIndex}
									quiz={previewQuiz}
									attempts={previewAttempts}
									moduleDescription={moduleForActiveQuiz?.description}
									onStartQuiz={() => navigate(`/learn/${courseId}/quiz/${activeQuizId}`)}
								/>
							) : null}
						</div>
					) : !activeLecture ? (
						<div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
							<div className="card" style={{ maxWidth: 480, textAlign: 'center' }}>
								<p style={{ color: 'var(--text-body)', fontSize: 16, lineHeight: 1.5, margin: 0 }}>Select a lecture or module quiz from the sidebar</p>
							</div>
						</div>
					) : (
						<div
							style={{
								width: '100%',
								maxWidth: 1024,
								padding: '32px 32px 48px',
								margin: '0 auto',
								display: 'flex',
								flexDirection: 'column',
								gap: 32,
								boxSizing: 'border-box',
							}}
						>
							{showCertBanner && courseFullyComplete ? (
								<Link
									to={`/learn/${courseId}/complete`}
									style={{
										display: 'block',
										padding: 16,
										borderRadius: 'var(--radius)',
										background: 'color-mix(in srgb, var(--success) 10%, var(--bg-surface))',
										color: 'var(--text-primary)',
										fontWeight: 600,
										textAlign: 'center',
										textDecoration: 'none',
										border: '1px solid color-mix(in srgb, var(--success) 22%, var(--border))',
									}}
								>
									Course complete! View celebration and get your certificate →
								</Link>
							) : showCertBanner ? (
								<div
									style={{
										padding: 16,
										borderRadius: 'var(--radius)',
										background: 'var(--bg-elevated)',
										color: 'var(--text-secondary)',
										fontWeight: 500,
										fontSize: 14,
										textAlign: 'center',
									}}
								>
									All lectures complete. Pass all published module quizzes to finish the course and unlock your certificate.
								</div>
							) : null}
							<div style={{ color: 'var(--text-primary)', fontSize: 24, fontWeight: 700, lineHeight: '32px' }}>{activeLecture.title}</div>

							<div
								style={{
									width: '100%',
									borderRadius: 'var(--radius-lg)',
									overflow: 'hidden',
									background: 'var(--text-primary)',
									boxShadow: 'var(--shadow-elevated)',
								}}
							>
								{showYt ? (
									<div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', height: 0 }}>
										<iframe
											title={activeLecture.title}
											src={videoEmbed}
											allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
											allowFullScreen
											style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
										/>
									</div>
								) : activeLecture.videoUrl ? (
									<div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', height: 0, background: 'var(--text-primary)' }}>
										<video
											controls
											src={activeLecture.videoUrl}
											style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
										>
											<track kind="captions" />
										</video>
									</div>
								) : (
									<div
										style={{
											aspectRatio: '16 / 9',
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											color: 'var(--text-muted)',
											fontSize: 14,
										}}
									>
										No video URL for this lecture.
									</div>
								)}
							</div>

							<div
								style={{
									display: 'flex',
									flexDirection: 'row',
									flexWrap: 'wrap',
									gap: 24,
									justifyContent: 'space-between',
									alignItems: 'flex-start',
									paddingBottom: 32,
									borderBottom: '1px solid var(--border)',
								}}
							>
								<div style={{ flex: '1 1 300px', maxWidth: 672, display: 'flex', flexDirection: 'column', gap: 8 }}>
									<div style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 700, lineHeight: '28px' }}>About this lecture</div>
									<div style={{ color: 'var(--text-secondary)', fontSize: 16, fontWeight: 400, lineHeight: '26px' }}>
										{activeLecture.description || 'No description for this lecture.'}
									</div>
									{markError ? <div style={{ color: 'var(--error)', fontSize: 14, marginTop: 4 }}>{markError}</div> : null}
								</div>
								<div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' }}>
									<button
										type="button"
										className="btn-primary btn-sm"
										disabled={isLectureComplete(activeLectureId) || isMarking}
										onClick={handleMarkComplete}
										style={{
											fontSize: 14,
											fontWeight: 700,
											opacity: isLectureComplete(activeLectureId) ? 0.65 : 1,
											cursor: isLectureComplete(activeLectureId) ? 'default' : 'pointer',
											padding: '11px 24px',
										}}
									>
										<svg width="15" height="15" viewBox="0 0 15 15" style={{ color: 'var(--bg-surface)' }}>
											<path fill="currentColor" d="M5.5 12.5.5 7.7l1.4-1.3 3.4 3.1 7.1-6.2 1.3 1.4-8.1 7.1z" />
										</svg>
										{isLectureComplete(activeLectureId) ? 'Completed' : 'Mark as Complete'}
									</button>
								</div>
							</div>

							<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
								<div style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 700, lineHeight: '28px' }}>Resources</div>
								<div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'stretch' }}>
									{Array.isArray(activeLecture.resources) && activeLecture.resources.length > 0 ? (
										activeLecture.resources.map((r) => {
											const { title: typeLabel, sub: subLabel } = getResourceLabel(r.fileUrl);
											const isHttp = r.fileUrl && /^https?:\/\//i.test(r.fileUrl);
											const external = isHttp && !/\/uploads\//i.test(r.fileUrl);
											return (
												<div
													key={r.id}
													className="card"
													style={{ flex: '1 1 180px', minWidth: 180, maxWidth: 400, display: 'flex', alignItems: 'center', gap: 16, padding: 16, boxShadow: 'var(--shadow-card)' }}
												>
													<div
														style={{
															width: 40,
															height: 40,
															borderRadius: 'var(--radius)',
															background: external ? 'var(--accent-bg)' : 'var(--bg-elevated)',
															display: 'flex',
															alignItems: 'center',
															justifyContent: 'center',
														}}
													>
														<svg width="20" height="20" viewBox="0 0 20 20" style={{ color: external ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
															<path
																fill="currentColor"
																d="M4 2h8l4 4v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm0 2v12h12V7h-3V4H4zm2 2h4v1H6V6zm0 2h4v1H6V8zm0 2h4v1H6v-1z"
															/>
														</svg>
													</div>
													<div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
														<div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 700, lineHeight: '20px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
														<div style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: '16px' }}>
															{external ? 'External Link' : `${typeLabel} · ${subLabel}`}
														</div>
													</div>
													{external ? (
														<a
															href={r.fileUrl}
															target="_blank"
															rel="noopener noreferrer"
															style={{ display: 'flex', color: 'var(--text-dim)' }}
															aria-label="Open link"
														>
															<svg width="18" height="18" viewBox="0 0 18 18">
																<path
																	fill="currentColor"
																	d="M4 2h4v1H4v9h9V10h1v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm9.5-1H17v1h-3.3L8.1 7.1 7.2 6.2 11.1 1H13V0h2.3l3.1 3.1L14 0z"
																/>
															</svg>
														</a>
													) : (
														<a href={r.fileUrl} target="_blank" rel="noopener noreferrer" download style={{ display: 'flex', color: 'var(--text-dim)' }} aria-label="Download">
															<svg width="16" height="16" viewBox="0 0 24 24">
																<path fill="currentColor" d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z" />
															</svg>
														</a>
													)}
												</div>
											);
										})
									) : (
										<div style={{ color: 'var(--text-muted)', fontSize: 14 }}>No resources for this lecture.</div>
									)}
								</div>
							</div>
						</div>
					)}
				</main>
			</div>
		</div>
	);
};

function CourseQuizPreview({ courseId, moduleIndex, quiz, attempts, moduleDescription, onStartQuiz }) {
	const sortedQuestions = [...(quiz.questions || [])].sort((a, b) => a.id - b.id);
	const n = sortedQuestions.length;
	const best = attempts.length ? Math.max(...attempts.map((a) => Number(a.score) || 0)) : null;
	const bestLabel = best == null ? 'Not attempted' : `${Math.round(best * 10) / 10}%`;
	const description =
		(moduleDescription && String(moduleDescription).trim()) ||
		'Test your knowledge of the material in this module. Read each question carefully and select the best answer.';

	return (
		<div
			style={{
				width: '100%',
				maxWidth: 1024,
				padding: '32px 32px 64px',
				margin: '0 auto',
				boxSizing: 'border-box',
			}}
		>
			<nav style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
				<Link to={`/learn/${courseId}`} style={{ color: 'var(--text-muted)' }}>
					Course home
				</Link>
				<span aria-hidden>›</span>
				<span style={{ color: 'var(--text-secondary)' }}>{moduleIndex >= 0 ? `Module ${moduleIndex + 1}` : 'Module'}</span>
				<span aria-hidden>›</span>
				<span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Quiz</span>
			</nav>
			<h1 style={{ color: 'var(--text-primary)', fontSize: 32, fontWeight: 800, lineHeight: 1.2, margin: '0 0 12px' }}>{quiz.title}</h1>
			<p style={{ color: 'var(--text-secondary)', fontSize: 16, lineHeight: 1.6, margin: '0 0 32px', maxWidth: 720 }}>{description}</p>

			<div
				style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
					gap: 16,
					marginBottom: 32,
				}}
			>
				<PreviewStatCard
					tint="var(--accent-bg)"
					iconColor="var(--accent)"
					label="Questions"
					value={String(n)}
					icon={
						<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
							<path fill="currentColor" d="M4 6h2v12H4V6zm4 0h2v7H8V6zm4 0h2v10h-2V6zm4 0h2v4h-2V6z" />
						</svg>
					}
				/>
				<PreviewStatCard
					tint="color-mix(in srgb, var(--success) 15%, var(--bg-surface))"
					iconColor="var(--success)"
					label="Passing score"
					value={`${quiz.passingScore}%`}
					icon={
						<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
							<path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" />
						</svg>
					}
				/>
				<PreviewStatCard
					tint="var(--bg-elevated)"
					iconColor="var(--text-secondary)"
					label="Attempts"
					value="Unlimited"
					icon={
						<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
							<path
								fill="currentColor"
								d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"
							/>
						</svg>
					}
				/>
				<PreviewStatCard
					tint="var(--bg-elevated)"
					iconColor="var(--text-body)"
					label="Best score"
					value={bestLabel}
					valueMuted={!attempts.length}
					icon={
						<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
							<path fill="currentColor" d="M5 16L3 5l5.5 3L12 3l3.5 2L21 3l-2 11H5zm0 0v2h14v-2H5z" />
						</svg>
					}
				/>
			</div>

			<div
				className="card course-quiz-preview-card"
				style={{
					textAlign: 'center',
					padding: '40px 32px 32px',
					maxWidth: 560,
					margin: '0 auto',
				}}
			>
				<div
					style={{
						width: 72,
						height: 72,
						margin: '0 auto 20px',
						borderRadius: 'var(--radius-pill)',
						background: 'var(--accent-bg)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						color: 'var(--accent)',
					}}
				>
					<svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden>
						<path
							stroke="currentColor"
							strokeWidth="1.7"
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.63 8.41m5.95 5.95a14.93 14.93 0 0 1-5.84 2.58m-.12-8.54a6 6 0 0 0-7.38 5.84h4.8m2.58-5.84a14.93 14.93 0 0 0-2.58 5.84m2.7 2.7a12.1 12.1 0 0 1-2.63 0 6.01 6.01 0 0 1-2.3-1.06"
						/>
					</svg>
				</div>
				<h2 style={{ color: 'var(--text-primary)', fontSize: 22, fontWeight: 800, margin: '0 0 12px' }}>Ready to start?</h2>
				<p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.6, margin: '0 0 28px' }}>
					Make sure you have a stable internet connection. The quiz will begin immediately after you click the button below.
				</p>
				<button type="button" className="btn-primary" onClick={onStartQuiz} style={{ display: 'inline-flex', margin: '0 auto' }}>
					Start quiz
					<svg width="16" height="16" viewBox="0 0 24 24" style={{ marginLeft: 4 }} aria-hidden>
						<path fill="currentColor" d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z" />
					</svg>
				</button>
				<p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '20px 0 0' }}>
					By starting, you agree to the <span style={{ textDecoration: 'underline', cursor: 'default' }}>Honor code</span>.
				</p>
			</div>
		</div>
	);
}

function PreviewStatCard({ tint, iconColor, label, value, valueMuted, icon }) {
	return (
		<div
			className="card course-quiz-preview-card"
			style={{
				padding: 16,
				display: 'flex',
				alignItems: 'flex-start',
				gap: 12,
				background: 'var(--bg-surface)',
			}}
		>
			<div
				style={{
					width: 44,
					height: 44,
					borderRadius: 'var(--radius-pill)',
					background: tint,
					color: iconColor,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					flexShrink: 0,
				}}
			>
				{icon}
			</div>
			<div>
				<div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 500, marginBottom: 2 }}>{label}</div>
				<div style={{ color: valueMuted ? 'var(--text-muted)' : 'var(--text-primary)', fontSize: 18, fontWeight: 700, lineHeight: 1.2 }}>{value}</div>
			</div>
		</div>
	);
}

export default CoursePlayer;
