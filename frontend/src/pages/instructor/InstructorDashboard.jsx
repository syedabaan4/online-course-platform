import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteCourse, getCourseById, getMyCourses, publishCourse } from '../../api/course.api';
import LoadingSpinner from '../../components/LoadingSpinner';
import PublishCourseModal from '../../components/PublishCourseModal';
import { confirmAction, showError, showSuccess } from '../../components/Toast';
import './InstructorDashboard.css';

const toArray = (payload) => {
	if (Array.isArray(payload)) {
		return payload;
	}

	if (Array.isArray(payload?.courses)) {
		return payload.courses;
	}

	if (Array.isArray(payload?.data)) {
		return payload.data;
	}

	return [];
};

const getEnrollmentCount = (course) => {
	if (typeof course?._count?.enrollments === 'number') {
		return course._count.enrollments;
	}

	if (typeof course?.enrollmentCount === 'number') {
		return course.enrollmentCount;
	}

	if (Array.isArray(course?.enrollments)) {
		return course.enrollments.length;
	}

	return 0;
};

const getUpdatedLabel = (course) => {
	const sourceDate = course?.updatedAt || course?.createdAt;
	if (!sourceDate) {
		return 'Recently updated';
	}

	const parsedDate = new Date(sourceDate);
	if (Number.isNaN(parsedDate.getTime())) {
		return 'Recently updated';
	}

	return `Updated ${parsedDate.toLocaleDateString()}`;
};

const isPublished = (course) => String(course?.status || '').toUpperCase() === 'PUBLISHED';

const InstructorDashboard = () => {
	const navigate = useNavigate();
	const [courses, setCourses] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [fetchError, setFetchError] = useState('');

	const [publishModal, setPublishModal] = useState({
		open: false,
		courseId: null,
		title: '',
		loading: false,
		modules: 0,
		lectures: 0,
		quizzes: 0,
	});
	const [isPublishingFromDash, setIsPublishingFromDash] = useState(false);

	const loadCourses = useCallback(async () => {
		setIsLoading(true);
		setFetchError('');

		try {
			const response = await getMyCourses();
			setCourses(toArray(response));
		} catch (error) {
			const message = String(error);
			setFetchError(message);
			showError(message);
			setCourses([]);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		loadCourses();
	}, [loadCourses]);

	const totalCourses = courses.length;
	const publishedCourses = useMemo(() => courses.filter((course) => isPublished(course)).length, [courses]);
	const draftCourses = totalCourses - publishedCourses;

	const openPublishFromDashboard = async (course) => {
		setPublishModal({
			open: true,
			courseId: course.id,
			title: course.title || 'Untitled course',
			loading: true,
			modules: 0,
			lectures: 0,
			quizzes: 0,
		});

		try {
			const raw = await getCourseById(course.id);
			const c = raw?.data ?? raw;
			const mods = c?.modules || [];
			const lect = mods.reduce((s, m) => s + (m.lectures?.length || 0), 0);
			const qz = mods.reduce((s, m) => s + (m.quiz?.isPublished ? 1 : 0), 0);
			setPublishModal((prev) => ({
				...prev,
				loading: false,
				modules: mods.length,
				lectures: lect,
				quizzes: qz,
			}));
		} catch (error) {
			const message = String(error);
			showError(message);
			setPublishModal((prev) => ({ ...prev, open: false, loading: false }));
		}
	};

	const closePublishFromDashboard = () => {
		if (isPublishingFromDash) {
			return;
		}
		setPublishModal((p) => ({ ...p, open: false }));
	};

	const handleConfirmPublishFromDashboard = async () => {
		if (!publishModal.courseId) {
			return;
		}
		setIsPublishingFromDash(true);
		try {
			await publishCourse(publishModal.courseId);
			showSuccess('Course published successfully.');
			setPublishModal((p) => ({ ...p, open: false }));
			await loadCourses();
		} catch (error) {
			showError(String(error));
		} finally {
			setIsPublishingFromDash(false);
		}
	};

	const handleDelete = async (courseId) => {
		const confirmed = await confirmAction('Delete course?', 'This action cannot be undone.');
		if (!confirmed) {
			return;
		}

		try {
			await deleteCourse(courseId);
			showSuccess('Course deleted successfully.');
			await loadCourses();
		} catch (error) {
			showError(String(error));
		}
	};

	return (
		<main
			className="page-fade"
			style={{
				width: '100%',
				maxWidth: '1280px',
				paddingTop: '32px',
				paddingBottom: '72px',
				paddingLeft: '24px',
				paddingRight: '24px',
				margin: '0 auto',
				display: 'flex',
				flexDirection: 'column',
				gap: '40px',
			}}
		>
			{isLoading ? (
				<LoadingSpinner fullPage />
			) : (
				<>
					<section style={{ alignSelf: 'stretch', display: 'inline-flex', justifyContent: 'space-between', alignItems: 'center' }}>
						<div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
							<h1
								style={{
									margin: 0,
									color: 'var(--text-primary)',
									fontFamily: 'var(--font)',
									fontSize: '36px',
									fontWeight: 700,
									lineHeight: '40px',
								}}
							>
								Instructor Dashboard
							</h1>
							<p
								style={{
									margin: 0,
									color: 'var(--text-muted)',
									fontFamily: 'var(--font)',
									fontSize: '16px',
									fontWeight: 400,
									lineHeight: '24px',
								}}
							>
								Here&apos;s what&apos;s happening with your courses today.
							</p>
						</div>

						<button type="button" className="btn-primary" onClick={() => navigate('/instructor/courses/new')}>
							<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
								<path d="M6 1V11M1 6H11" stroke="var(--bg-surface)" strokeWidth="1.5" strokeLinecap="round" />
							</svg>
							Create New Course
						</button>
					</section>

					<section style={{ alignSelf: 'stretch', display: 'inline-flex', gap: '24px', alignItems: 'stretch' }}>
						<article className="card card-elevated-surface instructor-dashboard-stat-card">
							<div style={{ display: 'inline-flex', alignItems: 'center', gap: '16px' }}>
								<div className="dashboard-stat-icon" aria-hidden>
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
										<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
										<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
										<path d="M8 7h8M8 11h6" />
									</svg>
								</div>
								<div style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px' }}>
									<span
										style={{
											color: 'var(--text-secondary)',
											fontFamily: 'var(--font)',
											fontSize: '14px',
											fontWeight: 500,
											lineHeight: '20px',
										}}
									>
										Total Courses
									</span>
									<strong
										style={{
											color: 'var(--text-primary)',
											fontFamily: 'var(--font)',
											fontSize: '24px',
											fontWeight: 700,
											lineHeight: '32px',
										}}
									>
										{totalCourses}
									</strong>
								</div>
							</div>
						</article>

						<article className="card card-elevated-surface instructor-dashboard-stat-card">
							<div style={{ display: 'inline-flex', alignItems: 'center', gap: '16px' }}>
								<div className="dashboard-stat-icon" aria-hidden>
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
										<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
										<polyline points="22 4 12 14.01 9 11.01" />
									</svg>
								</div>
								<div style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px' }}>
									<span
										style={{
											color: 'var(--text-secondary)',
											fontFamily: 'var(--font)',
											fontSize: '14px',
											fontWeight: 500,
											lineHeight: '20px',
										}}
									>
										Published
									</span>
									<strong
										style={{
											color: 'var(--text-primary)',
											fontFamily: 'var(--font)',
											fontSize: '24px',
											fontWeight: 700,
											lineHeight: '32px',
										}}
									>
										{publishedCourses}
									</strong>
								</div>
							</div>
						</article>

						<article className="card card-elevated-surface instructor-dashboard-stat-card">
							<div style={{ display: 'inline-flex', alignItems: 'center', gap: '16px' }}>
								<div className="dashboard-stat-icon" aria-hidden>
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
										<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
										<polyline points="14 2 14 8 20 8" />
										<line x1="8" y1="13" x2="16" y2="13" />
										<line x1="8" y1="17" x2="16" y2="17" />
										<line x1="8" y1="9" x2="12" y2="9" />
									</svg>
								</div>
								<div style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px' }}>
									<span
										style={{
											color: 'var(--text-secondary)',
											fontFamily: 'var(--font)',
											fontSize: '14px',
											fontWeight: 500,
											lineHeight: '20px',
										}}
									>
										Draft
									</span>
									<strong
										style={{
											color: 'var(--text-primary)',
											fontFamily: 'var(--font)',
											fontSize: '24px',
											fontWeight: 700,
											lineHeight: '32px',
										}}
									>
										{draftCourses}
									</strong>
								</div>
							</div>
						</article>
					</section>

					<section className="card card-elevated-surface instructor-dashboard-courses-card">
						<div
							style={{
								paddingLeft: '24px',
								paddingRight: '24px',
								paddingTop: '20px',
								paddingBottom: '20px',
								borderBottom: '1px solid var(--border)',
								display: 'inline-flex',
								alignItems: 'center',
								justifyContent: 'space-between',
								width: '100%',
							}}
						>
							<h2
								style={{
									margin: 0,
									color: 'var(--text-primary)',
									fontFamily: 'var(--font)',
									fontSize: '20px',
									fontWeight: 700,
									lineHeight: '28px',
								}}
							>
								Your Courses
							</h2>
						</div>

						{courses.length === 0 ? (
							<div className="empty-state" style={{ minHeight: '260px' }}>
								<p>No courses yet. Create your first one!</p>
							</div>
						) : (
							<>
								<div
									style={{
										width: '100%',
										background: 'var(--bg-surface-alt)',
										borderBottom: '1px solid var(--border)',
										display: 'grid',
										gridTemplateColumns: 'minmax(360px, 1fr) 140px 140px minmax(380px, 1fr)',
										alignItems: 'center',
									}}
								>
									<div style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, lineHeight: '16px', letterSpacing: '0.6px', fontFamily: 'var(--font)', textTransform: 'uppercase' }}>
										Course Name
									</div>
									<div style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, lineHeight: '16px', letterSpacing: '0.6px', fontFamily: 'var(--font)', textTransform: 'uppercase' }}>
										Students
									</div>
									<div style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, lineHeight: '16px', letterSpacing: '0.6px', fontFamily: 'var(--font)', textTransform: 'uppercase' }}>
										Status
									</div>
									<div style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, lineHeight: '16px', letterSpacing: '0.6px', fontFamily: 'var(--font)', textTransform: 'uppercase', textAlign: 'right' }}>
										Actions
									</div>
								</div>

								<div style={{ display: 'flex', flexDirection: 'column' }}>
									{courses.map((course, index) => {
										const published = isPublished(course);
										const studentCount = getEnrollmentCount(course);
										const titleInitial = String(course?.title || 'C').charAt(0).toUpperCase();

										return (
											<div
												key={course.id}
												style={{
													display: 'grid',
													gridTemplateColumns: 'minmax(360px, 1fr) 140px 140px minmax(380px, 1fr)',
													alignItems: 'center',
													borderTop: index === 0 ? 'none' : '1px solid var(--border)',
													minHeight: '96px',
												}}
											>
												<div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
													{course.thumbnailUrl ? (
														<img
															src={course.thumbnailUrl}
															alt={course.title}
															style={{ width: '48px', height: '48px', borderRadius: 'var(--radius)', objectFit: 'cover', background: 'var(--bg-elevated)' }}
														/>
													) : (
														<div
															style={{
																width: '48px',
																height: '48px',
																borderRadius: 'var(--radius)',
																background: 'var(--bg-elevated)',
																display: 'flex',
																alignItems: 'center',
																justifyContent: 'center',
																color: 'var(--text-body)',
																fontFamily: 'var(--font)',
																fontSize: '16px',
																fontWeight: 700,
															}}
														>
															{titleInitial}
														</div>
													)}

													<div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
														<div style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: 700, lineHeight: '24px', fontFamily: 'var(--font)' }}>
															{course.title || 'Untitled Course'}
														</div>
														<div style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 400, lineHeight: '16px', fontFamily: 'var(--font)' }}>
															{getUpdatedLabel(course)}
														</div>
													</div>
												</div>

												<div style={{ padding: '16px 24px', color: 'var(--text-muted)', fontSize: '16px', fontWeight: 500, lineHeight: '20px', fontFamily: 'var(--font)' }}>
													{studentCount}
												</div>

												<div style={{ padding: '16px 24px' }}>
													<span className={`badge ${published ? 'badge-published' : 'badge-draft'}`}>{published ? 'Published' : 'Draft'}</span>
												</div>

												<div className="instructor-course-actions" style={{ padding: '16px 24px' }}>
													<button type="button" className="btn-secondary btn-sm" onClick={() => navigate(`/instructor/courses/${course.id}/build`)}>
														Build Content
													</button>
													<button type="button" className="btn-secondary btn-sm" onClick={() => navigate(`/instructor/courses/${course.id}/edit`)}>
														Edit
													</button>
													{!published ? (
														<button
															type="button"
															className="btn-primary btn-sm"
															onClick={() => openPublishFromDashboard(course)}
														>
															Publish
														</button>
													) : null}
													<button type="button" className="btn-danger btn-sm" onClick={() => handleDelete(course.id)}>
														Delete
													</button>
												</div>
											</div>
										);
									})}
								</div>
							</>
						)}

						{fetchError ? (
							<div
								style={{
									padding: '16px 24px',
									borderTop: '1px solid var(--border)',
									color: 'var(--error)',
									fontFamily: 'var(--font)',
									fontSize: '14px',
									lineHeight: '20px',
								}}
							>
								{fetchError}
							</div>
						) : null}
					</section>
				</>
			)}
			<PublishCourseModal
				isOpen={publishModal.open}
				onClose={closePublishFromDashboard}
				onPublish={handleConfirmPublishFromDashboard}
				courseTitle={publishModal.title}
				moduleCount={publishModal.modules}
				lectureCount={publishModal.lectures}
				quizCount={publishModal.quizzes}
				isPublishing={isPublishingFromDash}
				isLoading={publishModal.loading}
			/>
		</main>
	);
};

export default InstructorDashboard;
