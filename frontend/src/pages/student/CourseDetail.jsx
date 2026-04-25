import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getCourseById } from '../../api/course.api';
import { enrollInCourse } from '../../api/enrollment.api';
import { showError, showSuccess } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';

const normalizeCourse = (payload) => payload?.data ?? payload;

const formatDifficulty = (d) => {
	const s = String(d || '').toLowerCase();
	return s ? s.charAt(0).toUpperCase() + s.slice(1) : '—';
};

const CourseDetail = () => {
	const { id } = useParams();
	const navigate = useNavigate();
	const { user, isAuthenticated, isInstructor } = useAuth();

	const [course, setCourse] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [loadError, setLoadError] = useState('');
	const [isEnrolling, setIsEnrolling] = useState(false);

	const courseId = parseInt(id, 10);

	const load = useCallback(async () => {
		if (!Number.isFinite(courseId) || courseId < 1) {
			setLoadError('Invalid course.');
			setCourse(null);
			setIsLoading(false);
			return;
		}
		setIsLoading(true);
		setLoadError('');
		try {
			const res = await getCourseById(courseId);
			setCourse(normalizeCourse(res));
		} catch (e) {
			const msg = String(e);
			setLoadError(msg);
			setCourse(null);
		} finally {
			setIsLoading(false);
		}
	}, [courseId]);

	useEffect(() => {
		load();
	}, [load]);

	const isOwner = Boolean(
		course && isInstructor && user && course.instructorId != null && user.id === course.instructorId
	);
	const isStudent = isAuthenticated && String(user?.role || '').toUpperCase() === 'STUDENT';

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

	if (isLoading) {
		return (
			<main className="page-fade" style={{ padding: 64, display: 'flex', justifyContent: 'center' }}>
				<div className="spinner" />
			</main>
		);
	}

	if (loadError || !course) {
		return (
			<main className="page-fade" style={{ maxWidth: 640, margin: '0 auto', padding: 48, fontFamily: 'var(--font)' }}>
				<h1 style={{ color: 'var(--text-primary)' }}>Course not found</h1>
				<p style={{ color: 'var(--text-muted)' }}>{loadError || 'This course is unavailable or has been removed.'}</p>
				<Link to="/courses" className="btn-secondary" style={{ marginTop: 16, display: 'inline-flex' }}>
					Back to catalog
				</Link>
			</main>
		);
	}

	const modules = Array.isArray(course.modules) ? course.modules : [];

	return (
		<main
			className="page-fade"
			style={{
				width: '100%',
				maxWidth: 800,
				margin: '0 auto',
				padding: '32px 24px 72px',
				color: 'var(--text-body)',
				fontFamily: 'var(--font)',
			}}
		>
			<div style={{ marginBottom: 16 }}>
				<Link to="/courses" style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>
					← Course catalog
				</Link>
			</div>

			<header style={{ marginBottom: 24 }}>
				<h1
					style={{
						margin: '0 0 12px',
						color: 'var(--text-primary)',
						fontSize: 32,
						fontWeight: 800,
						lineHeight: 1.2,
					}}
				>
					{course.title}
				</h1>
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
					{course.instructor?.name ? (
						<span style={{ color: 'var(--text-secondary)', fontSize: 15 }}>Instructor: {course.instructor.name}</span>
					) : null}
					<span className="badge badge-gray">{course.category || '—'}</span>
					<span className={`badge ${getDifficultyBadgeClass(course.difficulty)}`}>
						{formatDifficulty(course.difficulty)}
					</span>
				</div>
			</header>

			<p style={{ lineHeight: 1.6, color: 'var(--text-body)', marginBottom: 24 }}>{course.description}</p>

			<section className="card" style={{ padding: 20, marginBottom: 24 }}>
				<h2 style={{ margin: '0 0 12px', fontSize: 18, color: 'var(--text-primary)' }}>Syllabus</h2>
				{modules.length === 0 ? (
					<p style={{ color: 'var(--text-muted)', margin: 0 }}>Syllabus will appear here when modules are available.</p>
				) : (
					<ol style={{ margin: 0, paddingLeft: 20, color: 'var(--text-body)' }}>
						{modules.map((m) => {
							const lectCount = m.lectures?.length || 0;
							return (
								<li key={m.id} style={{ marginBottom: 8 }}>
									<strong>Module {m.order}: {m.title}</strong>
									<span style={{ color: 'var(--text-muted)' }}> — {lectCount} lecture{lectCount === 1 ? '' : 's'}</span>
								</li>
							);
						})}
					</ol>
				)}
			</section>

			<div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
				{isOwner ? (
					<Link to={`/instructor/courses/${courseId}/build`} className="btn-primary">
						Manage content
					</Link>
				) : null}
				{!isInstructor && (
					<button type="button" className="btn-primary" onClick={handleEnroll} disabled={isEnrolling}>
						{isEnrolling ? 'Enrolling…' : isStudent ? 'Enroll now' : 'Log in to enroll'}
					</button>
				)}
			</div>
		</main>
	);
};

function getDifficultyBadgeClass(d) {
	const level = String(d || '').toUpperCase();
	if (level === 'BEGINNER') {
		return 'badge-beginner';
	}
	if (level === 'INTERMEDIATE') {
		return 'badge-intermediate';
	}
	if (level === 'ADVANCED') {
		return 'badge-advanced';
	}
	return 'badge-gray';
}

export default CourseDetail;
