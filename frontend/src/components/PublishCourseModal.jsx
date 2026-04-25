import { createPortal } from 'react-dom';
import './PublishCourseModal.css';

const itemsFromCounts = (moduleCount, lectureCount, quizCount) => [
	{
		label: `${moduleCount} ${moduleCount === 1 ? 'Module' : 'Modules'}`,
		status: moduleCount > 0 ? 'Completed' : 'Missing',
		ok: moduleCount > 0,
	},
	{
		label: `${lectureCount} ${lectureCount === 1 ? 'Lecture' : 'Lectures'}`,
		status: lectureCount > 0 ? 'Uploaded' : 'Missing',
		ok: lectureCount > 0,
	},
	{
		label: `${quizCount} ${quizCount === 1 ? 'Quiz' : 'Quizzes'}`,
		status: quizCount > 0 ? 'Ready' : 'Missing',
		ok: quizCount > 0,
	},
];

const PublishCourseModal = ({
	isOpen,
	onClose,
	onPublish,
	courseTitle,
	moduleCount = 0,
	lectureCount = 0,
	quizCount = 0,
	isPublishing = false,
	isLoading = false,
}) => {
	if (!isOpen) {
		return null;
	}

	const items = itemsFromCounts(moduleCount, lectureCount, quizCount);

	return createPortal(
		<div className="publish-modal-backdrop" onClick={onClose} role="presentation">
			<div
				className="publish-modal"
				role="dialog"
				aria-modal="true"
				aria-labelledby="publish-modal-title"
				aria-busy={isLoading || isPublishing}
				onClick={(e) => e.stopPropagation()}
			>
				<div className="publish-modal__accent" aria-hidden />
				<div className="publish-modal__body">
					<div className="publish-modal__hero">
						<div className="publish-modal-rocket" aria-hidden>
							<svg
								width="27"
								height="27"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.4"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
								<path d="m12 15-3-3a22 22 0 0 0 2-3 22 22 0 0 0 2-3l3 3" />
								<path d="M9 12H4s.5-4 2.5-6 3.5-2.5 3.5-2.5" />
							</svg>
						</div>
						<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
							<h2 className="publish-modal__headline" id="publish-modal-title">
								Publish Course?
							</h2>
							<p className="publish-modal__lede">
								{'\u201C'}
								<strong>{courseTitle || 'Untitled course'}</strong>
								{'\u201D'} will become visible to all
								<br />
								students in the course catalog.
							</p>
						</div>
					</div>

					{isLoading ? (
						<div className="publish-modal-checklist publish-modal-checklist--loading">
							<div className="spinner" />
						</div>
					) : (
						<div className="publish-modal-checklist">
							<p className="publish-modal-checklist__eyebrow">Ready to publish</p>
							{items.map((item) => (
								<div className="publish-modal-checklist__row" key={item.label}>
									<span
										className={
											item.ok
												? 'publish-modal-checklist__ok publish-modal-checklist__ok--done'
												: 'publish-modal-checklist__ok publish-modal-checklist__ok--miss'
										}
										aria-hidden
									>
										{item.ok ? (
											<svg width="11" height="8" viewBox="0 0 11 8" fill="none" aria-hidden>
												<path
													d="M1 4L4 7L10 1"
													stroke="currentColor"
													strokeWidth="1.4"
													strokeLinecap="round"
													strokeLinejoin="round"
												/>
											</svg>
										) : (
											<span className="publish-modal-checklist__miss-dot" />
										)}
									</span>
									<span className="publish-modal-checklist__label">{item.label}</span>
									<span className="publish-modal-checklist__status">{item.status}</span>
								</div>
							))}
						</div>
					)}

					<div className="publish-modal-actions">
						<button type="button" className="btn-secondary" onClick={onClose} disabled={isPublishing || isLoading}>
							Cancel
						</button>
						<button
							type="button"
							className="btn-primary"
							onClick={onPublish}
							disabled={isPublishing || isLoading}
						>
							{isPublishing ? 'Publishing…' : 'Publish Now'}
							<svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
								<path
									d="M4 10h10M10 4l5 5-5 5"
									stroke="currentColor"
									strokeWidth="1.4"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						</button>
					</div>
				</div>
			</div>
		</div>,
		document.body
	);
};

export default PublishCourseModal;
