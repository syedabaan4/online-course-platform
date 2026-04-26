import { createPortal } from 'react-dom';
import './PublishCourseModal.css';

const ConfirmActionModal = ({
	title,
	text,
	confirmLabel = 'Yes, do it',
	cancelLabel = 'Cancel',
	danger = true,
	onCancel,
	onConfirm,
}) => {
	return createPortal(
		<div className="publish-modal-backdrop" onClick={onCancel} role="presentation">
			<div
				className="publish-modal"
				role="alertdialog"
				aria-modal="true"
				aria-labelledby="confirm-modal-title"
				aria-describedby="confirm-modal-desc"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="publish-modal__accent" aria-hidden />
				<div className="publish-modal__body">
					<div className="publish-modal__hero">
						<div
							className={`publish-modal-rocket ${danger ? 'publish-modal-rocket--confirm-warn' : ''}`}
							aria-hidden
						>
							{danger ? (
								<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
									<path
										d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
										stroke="currentColor"
										strokeWidth="1.4"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
							) : (
								<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
									<circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.4" />
									<path d="M12 8v5M12 16h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
								</svg>
							)}
						</div>
						<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
							<h2 className="publish-modal__headline" id="confirm-modal-title">
								{title}
							</h2>
							<p className="publish-modal__lede" id="confirm-modal-desc">
								{text}
							</p>
						</div>
					</div>
					<div className="publish-modal-actions">
						<button type="button" className="btn-secondary" onClick={onCancel}>
							{cancelLabel}
						</button>
						<button type="button" className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm}>
							{confirmLabel}
						</button>
					</div>
				</div>
			</div>
		</div>,
		document.body
	);
};

export default ConfirmActionModal;
