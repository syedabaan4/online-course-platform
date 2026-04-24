import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

const getDifficultyBadgeClass = (difficulty) => {
	const level = String(difficulty || '').toUpperCase();

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
};

const clampProgress = (value) => {
	const numeric = Number(value);
	if (Number.isNaN(numeric)) {
		return 0;
	}

	return Math.max(0, Math.min(100, Math.round(numeric)));
};

const CourseCard = ({ course, showProgress = false, progress = 0 }) => {
	const [isHovered, setIsHovered] = useState(false);
	const [imageError, setImageError] = useState(false);

	if (!course) {
		return (
			<div
				className="card"
				style={{
					width: '278px',
					borderRadius: '12px',
					padding: '20px',
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					minHeight: '280px',
				}}
			>
				<div className="spinner" />
			</div>
		);
	}

	const hasCriticalData = Boolean(course.id && course.title && course.description);

	const displayDifficulty = String(course.difficulty || 'Draft').toLowerCase();
	const difficultyLabel = displayDifficulty.charAt(0).toUpperCase() + displayDifficulty.slice(1);
	const badgeClass = getDifficultyBadgeClass(course.difficulty);

	const titleInitial = (course.title || 'C').trim().charAt(0).toUpperCase();
	const instructorName = course.instructor?.name || 'Unknown Instructor';
	const instructorInitials = instructorName
		.split(' ')
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase())
		.join('');

	const displayCategory = course.category || 'General';
	const displayRating = course.rating ?? '0.0';
	const displayRatingsCount = course.ratingsCount ?? 0;
	const displayDuration = course.duration || '--';

	const progressValue = useMemo(() => clampProgress(progress), [progress]);

	return (
		<div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start' }}>
			<Link
				to={`/courses/${course.id}`}
				className="card"
				style={{
					width: '278px',
					borderRadius: '12px',
					padding: 0,
					overflow: 'hidden',
					outline: '1px solid var(--border)',
					outlineOffset: '-1px',
					transform: isHovered ? 'scale(1.02)' : 'scale(1)',
					transition: 'transform 0.2s ease',
				}}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
			>
				<div
					style={{
						alignSelf: 'stretch',
						position: 'relative',
						overflow: 'hidden',
						display: 'flex',
						flexDirection: 'column',
						justifyContent: 'center',
						alignItems: 'flex-start',
					}}
				>
					{course.thumbnailUrl && !imageError ? (
						<img
							src={course.thumbnailUrl}
							alt={course.title}
							onError={() => setImageError(true)}
							style={{
								alignSelf: 'stretch',
								height: '155.25px',
								position: 'relative',
								objectFit: 'cover',
							}}
						/>
					) : (
						<div
							style={{
								alignSelf: 'stretch',
								height: '155.25px',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								background:
									'linear-gradient(135deg, var(--accent-bg) 0%, var(--accent-badge-bg) 55%, var(--bg-surface-alt) 100%)',
								color: 'var(--accent)',
								fontFamily: 'var(--font)',
								fontWeight: 700,
								fontSize: '40px',
								lineHeight: '40px',
							}}
						>
							{titleInitial}
						</div>
					)}

					<div
						style={{
							paddingLeft: '10px',
							paddingRight: '10px',
							paddingTop: '4px',
							paddingBottom: '4px',
							left: '12px',
							top: '12px',
							position: 'absolute',
							background: 'color-mix(in srgb, var(--bg-surface) 90%, transparent)',
							boxShadow: 'var(--shadow-card)',
							borderRadius: '4px',
							backdropFilter: 'blur(4px)',
							display: 'flex',
							flexDirection: 'column',
							justifyContent: 'flex-start',
							alignItems: 'flex-start',
						}}
					>
						<div
							className={`badge ${badgeClass}`}
							style={{
								padding: 0,
								border: 'none',
								background: 'transparent',
								color: 'var(--text-primary)',
							}}
						>
							{difficultyLabel}
						</div>
					</div>

					<div
						style={{
							padding: '8px',
							left: '236.33px',
							top: '12px',
							position: 'absolute',
							opacity: 0,
							background: 'color-mix(in srgb, var(--bg-surface) 10%, transparent)',
							borderRadius: '9999px',
							backdropFilter: 'blur(4px)',
							display: 'flex',
							flexDirection: 'column',
							justifyContent: 'center',
							alignItems: 'center',
						}}
						aria-hidden="true"
					>
						<svg width="12" height="15" viewBox="0 0 12 15" fill="none">
							<path
								d="M2 1.25C1.44772 1.25 1 1.69772 1 2.25V14L6 11L11 14V2.25C11 1.69772 10.5523 1.25 10 1.25H2Z"
								fill="var(--bg-surface)"
							/>
						</svg>
					</div>
				</div>

				<div
					style={{
						alignSelf: 'stretch',
						padding: '20px',
						display: 'flex',
						flexDirection: 'column',
						justifyContent: 'space-between',
						alignItems: 'flex-start',
					}}
				>
					<div
						style={{
							alignSelf: 'stretch',
							paddingBottom: '8px',
							display: 'flex',
							flexDirection: 'column',
							justifyContent: 'flex-start',
							alignItems: 'flex-start',
						}}
					>
						<div style={{ alignSelf: 'stretch', display: 'inline-flex', justifyContent: 'space-between', alignItems: 'center' }}>
							<div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '4px' }}>
								<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
									<path
										d="M7 0.75L1.75 3.5V7C1.75 10.0625 3.9875 12.925 7 13.25C10.0125 12.925 12.25 10.0625 12.25 7V3.5L7 0.75Z"
										fill="var(--text-muted)"
									/>
								</svg>
								<div
									style={{
										height: '16px',
										display: 'flex',
										flexDirection: 'column',
										justifyContent: 'center',
										color: 'var(--text-muted)',
										fontSize: '12px',
										fontFamily: 'var(--font)',
										fontWeight: 500,
										lineHeight: '16px',
									}}
								>
									{displayCategory}
								</div>
							</div>

							<div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '4px' }}>
								<svg width="14" height="13" viewBox="0 0 14 13" fill="none" aria-hidden="true">
									<path
										d="M7 0.5L8.73 4L12.59 4.56L9.8 7.28L10.46 11.12L7 9.3L3.54 11.12L4.2 7.28L1.41 4.56L5.27 4L7 0.5Z"
										fill="var(--accent)"
									/>
								</svg>
								<div
									style={{
										display: 'flex',
										flexDirection: 'column',
										justifyContent: 'center',
										color: 'var(--text-body)',
										fontSize: '12px',
										fontFamily: 'var(--font)',
										fontWeight: 600,
										lineHeight: '16px',
									}}
								>
									{displayRating}
								</div>
								<div
									style={{
										display: 'flex',
										flexDirection: 'column',
										justifyContent: 'center',
										color: 'var(--text-dim)',
										fontSize: '12px',
										fontFamily: 'var(--font)',
										fontWeight: 400,
										lineHeight: '16px',
									}}
								>
									({displayRatingsCount})
								</div>
							</div>
						</div>
					</div>

					<div
						style={{
							alignSelf: 'stretch',
							paddingBottom: '8px',
							display: 'flex',
							flexDirection: 'column',
							justifyContent: 'flex-start',
							alignItems: 'flex-start',
						}}
					>
						<div
							style={{
								alignSelf: 'stretch',
								overflow: 'hidden',
								display: 'flex',
								flexDirection: 'column',
								justifyContent: 'flex-start',
								alignItems: 'flex-start',
							}}
						>
							<div
								style={{
									alignSelf: 'stretch',
									display: '-webkit-box',
									WebkitLineClamp: 2,
									WebkitBoxOrient: 'vertical',
									overflow: 'hidden',
									color: 'var(--text-primary)',
									fontSize: '18px',
									fontFamily: 'var(--font)',
									fontWeight: 700,
									lineHeight: '28px',
								}}
							>
								{course.title}
							</div>
						</div>
					</div>

					<div
						style={{
							alignSelf: 'stretch',
							paddingBottom: showProgress ? '12px' : '16px',
							display: 'flex',
							flexDirection: 'column',
							justifyContent: 'flex-start',
							alignItems: 'flex-start',
						}}
					>
						<div
							style={{
								alignSelf: 'stretch',
								overflow: 'hidden',
								display: 'flex',
								flexDirection: 'column',
								justifyContent: 'flex-start',
								alignItems: 'flex-start',
							}}
						>
							<div
								style={{
									alignSelf: 'stretch',
									display: '-webkit-box',
									WebkitLineClamp: 2,
									WebkitBoxOrient: 'vertical',
									overflow: 'hidden',
									color: 'var(--text-muted)',
									fontSize: '14px',
									fontFamily: 'var(--font)',
									fontWeight: 400,
									lineHeight: '20px',
								}}
							>
								{course.description}
							</div>
						</div>
					</div>

					{showProgress ? (
						<div
							style={{
								alignSelf: 'stretch',
								paddingBottom: '16px',
								display: 'flex',
								flexDirection: 'column',
								gap: '8px',
							}}
						>
							<div className="progress-bar">
								<div className="progress-fill" style={{ width: `${progressValue}%` }} />
							</div>
							<div
								style={{
									color: 'var(--text-muted)',
									fontSize: '12px',
									fontFamily: 'var(--font)',
									fontWeight: 500,
									lineHeight: '16px',
								}}
							>
								{progressValue}% complete
							</div>
						</div>
					) : null}

					<div
						style={{
							alignSelf: 'stretch',
							paddingTop: '16px',
							borderTop: '1px solid var(--border-light)',
							display: 'inline-flex',
							justifyContent: 'space-between',
							alignItems: 'center',
						}}
					>
						<div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '8px' }}>
							<div
								style={{
									width: '24px',
									height: '24px',
									borderRadius: '9999px',
									background: 'var(--bg-elevated)',
									color: 'var(--text-body)',
									display: 'inline-flex',
									alignItems: 'center',
									justifyContent: 'center',
									fontSize: '10px',
									lineHeight: '10px',
									fontWeight: 600,
									fontFamily: 'var(--font)',
								}}
							>
								{instructorInitials || 'I'}
							</div>
							<div
								style={{
									display: 'flex',
									flexDirection: 'column',
									justifyContent: 'center',
									color: 'var(--text-body)',
									fontSize: '12px',
									fontFamily: 'var(--font)',
									fontWeight: 500,
									lineHeight: '16px',
								}}
							>
								{instructorName}
							</div>
						</div>

						<div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '4px' }}>
							<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
								<path
									d="M6 1C3.23858 1 1 3.23858 1 6C1 8.76142 3.23858 11 6 11C8.76142 11 11 8.76142 11 6C11 3.23858 8.76142 1 6 1ZM6.625 3.5V6.25L8.5 7.375"
									stroke="var(--text-muted)"
									strokeWidth="1.2"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
							<div
								style={{
									display: 'flex',
									flexDirection: 'column',
									justifyContent: 'center',
									color: 'var(--text-muted)',
									fontSize: '12px',
									fontFamily: 'var(--font)',
									fontWeight: 500,
									lineHeight: '16px',
								}}
							>
								{displayDuration}
							</div>
						</div>
					</div>
				</div>
			</Link>

			{!hasCriticalData ? (
				<div
					style={{
						width: '278px',
						paddingTop: '8px',
						color: 'var(--error)',
						fontFamily: 'var(--font)',
						fontSize: '12px',
						lineHeight: '16px',
					}}
				>
					Failed to load course data.
				</div>
			) : null}
		</div>
	);
};

export default CourseCard;
