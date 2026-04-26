import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getCourseById } from '../../api/course.api';
import {
	addQuestion,
	createQuiz,
	deleteQuestion,
	getQuizByModule,
	publishQuiz,
	updateQuestion,
	updateQuiz,
} from '../../api/quiz.api';
import { confirmAction, showError, showSuccess } from '../../components/Toast';
import './QuizBuilder.css';

const emptyOptions = () => ['', '', '', ''];

const looksLikeCodeSnippet = (s) => {
	if (!s || typeof s !== 'string') {
		return false;
	}
	const t = s.trim();
	return t.startsWith('<') || t.includes('</') || t === '<p>' || t === '<p/>';
};

const buildPayloadOptions = (options, correctIndex) => {
	const rows = [0, 1, 2, 3]
		.map((i) => ({ text: (options[i] || '').trim(), idx: i }))
		.filter((r) => r.text);

	if (rows.length < 2 || rows.length > 4) {
		return { error: 'Please enter 2 to 4 answer options (non-empty).' };
	}

	const hasCorrect = rows.some((r) => r.idx === correctIndex);
	if (!hasCorrect) {
		return { error: 'Select a correct answer from your filled-in options (use the “Correct” radio).' };
	}

	return {
		options: rows.map((r) => ({
			text: r.text,
			isCorrect: r.idx === correctIndex,
		})),
	};
};

const formatRelativeSaved = (ts) => {
	if (!ts) {
		return '';
	}
	const sec = Math.max(0, (Date.now() - ts) / 1000);
	if (sec < 60) {
		return 'just now';
	}
	const min = Math.floor(sec / 60);
	if (min < 60) {
		return `${min} min${min === 1 ? '' : 's'} ago`;
	}
	const h = Math.floor(min / 60);
	if (h < 24) {
		return `${h} hour${h === 1 ? '' : 's'} ago`;
	}
	return 'today';
};

const normalizePayload = (p) => p?.data ?? p;

const QuizBuilder = () => {
	const { id: courseId, moduleId: moduleIdParam } = useParams();
	const navigate = useNavigate();
	const moduleId = parseInt(moduleIdParam, 10);

	const [isLoading, setIsLoading] = useState(true);
	const [loadError, setLoadError] = useState('');

	const [moduleTitle, setModuleTitle] = useState('');

	const [quiz, setQuiz] = useState(null);
	const [title, setTitle] = useState('');
	const [passingScore, setPassingScore] = useState(70);
	const [lastSavedAt, setLastSavedAt] = useState(null);
	const [tick, setTick] = useState(0);

	const [isSavingQuiz, setIsSavingQuiz] = useState(false);
	const [isPublishing, setIsPublishing] = useState(false);
	const [sectionError, setSectionError] = useState('');

	const [qModal, setQModal] = useState({
		isOpen: false,
		mode: 'add',
		questionId: null,
		text: '',
		options: emptyOptions(),
		correctIndex: 0,
	});
	const [qModalError, setQModalError] = useState('');
	const [isSavingQuestion, setIsSavingQuestion] = useState(false);

	const [isPreviewOpen, setIsPreviewOpen] = useState(false);

	useEffect(() => {
		const id = setInterval(() => setTick((n) => n + 1), 30000);
		return () => clearInterval(id);
	}, []);

	const refreshQuiz = useCallback(async () => {
		const res = await getQuizByModule(moduleId);
		const data = normalizePayload(res);
		setQuiz(data);
		if (data) {
			setTitle(data.title || '');
			setPassingScore(Number.isFinite(data.passingScore) ? data.passingScore : 70);
		}
		return data;
	}, [moduleId]);

	const load = useCallback(async () => {
		if (!Number.isFinite(moduleId) || moduleId < 1) {
			setLoadError('Invalid module link.');
			setIsLoading(false);
			return;
		}
		setIsLoading(true);
		setLoadError('');
		try {
			const courseRes = await getCourseById(courseId);
			const course = normalizePayload(courseRes);
			if (!course?.modules) {
				setLoadError('Course not found.');
				return;
			}
			const mod = course.modules.find((m) => m.id === moduleId);
			if (!mod) {
				setLoadError('This module is not part of the selected course.');
				return;
			}
			setModuleTitle(mod.title || 'Module');

			const res = await getQuizByModule(moduleId);
			const data = normalizePayload(res);
			setQuiz(data);
			if (data) {
				setTitle(data.title || `${mod.title} Quiz`.trim() || 'Untitled quiz');
				setPassingScore(Number.isFinite(data.passingScore) ? data.passingScore : 70);
			} else {
				setTitle((mod.title ? `${mod.title} Quiz` : 'Module quiz').trim() || 'Untitled quiz');
				setPassingScore(70);
			}
		} catch (e) {
			const msg = String(e);
			setLoadError(msg);
			showError(msg);
		} finally {
			setIsLoading(false);
		}
	}, [courseId, moduleId]);

	useEffect(() => {
		load();
	}, [load]);

	const getOrCreateQuiz = async () => {
		if (quiz?.id) {
			return quiz;
		}
		if (!title.trim()) {
			throw new Error('Please enter a quiz title (you can save the quiz with no questions).');
		}
		const ps = passingScore === '' || passingScore === null || passingScore === undefined
			? NaN
			: parseInt(String(passingScore), 10);
		if (Number.isNaN(ps) || ps < 0 || ps > 100) {
			throw new Error('Passing score must be a whole number from 0 to 100.');
		}

		try {
			const res = await createQuiz({ moduleId, title: title.trim(), passingScore: ps });
			const newQuiz = normalizePayload(res);
			setQuiz(newQuiz);
			setLastSavedAt(Date.now());
			return newQuiz;
		} catch (err) {
			const msg = String(err);
			if (msg.toLowerCase().includes('already exists')) {
				const r = await getQuizByModule(moduleId);
				const existing = normalizePayload(r);
				if (existing) {
					setQuiz(existing);
					setTitle(existing.title);
					setPassingScore(existing.passingScore);
					return existing;
				}
			}
			throw err;
		}
	};

	const handleSaveQuiz = async () => {
		setSectionError('');
		if (!title.trim()) {
			const m = 'Quiz title is required.';
			setSectionError(m);
			showError(m);
			return;
		}
		const ps = passingScore === '' || passingScore === null || passingScore === undefined
			? NaN
			: parseInt(String(passingScore), 10);
		if (Number.isNaN(ps) || ps < 0 || ps > 100) {
			const m = 'Passing score must be from 0 to 100.';
			setSectionError(m);
			showError(m);
			return;
		}

		setIsSavingQuiz(true);
		try {
			if (quiz?.id) {
				const res = await updateQuiz(quiz.id, { title: title.trim(), passingScore: ps });
				const updated = normalizePayload(res);
				setQuiz((prev) => (prev && updated ? { ...prev, ...updated } : prev));
			} else {
				await getOrCreateQuiz();
			}
			await refreshQuiz();
			setLastSavedAt(Date.now());
			showSuccess('Quiz saved');
		} catch (e) {
			const m = String(e);
			setSectionError(m);
			showError(m);
		} finally {
			setIsSavingQuiz(false);
		}
	};

	const isQuizPublished = Boolean(quiz?.isPublished);

	const handlePublishQuiz = async () => {
		if (!quiz?.id || isQuizPublished) {
			return;
		}
		if (questionsCount < 1) {
			const m = 'Add at least one question before publishing.';
			setSectionError(m);
			showError(m);
			return;
		}
		setSectionError('');
		setIsPublishing(true);
		try {
			const res = await publishQuiz(quiz.id);
			const updated = normalizePayload(res);
			setQuiz((prev) => (prev && updated ? { ...prev, ...updated } : prev));
			await refreshQuiz();
			setLastSavedAt(Date.now());
			showSuccess('Quiz published. It is now included in the course and content builder.');
		} catch (e) {
			const m = String(e);
			setSectionError(m);
			showError(m);
		} finally {
			setIsPublishing(false);
		}
	};

	const openAddQuestion = () => {
		setQModalError('');
		setQModal({
			isOpen: true,
			mode: 'add',
			questionId: null,
			text: '',
			options: emptyOptions(),
			correctIndex: 0,
		});
	};

	const openEditQuestion = (q) => {
		const sorted = [...(q.options || [])].sort((a, b) => (a.id || 0) - (b.id || 0));
		const filled = ['', '', '', ''];
		sorted.slice(0, 4).forEach((o, i) => {
			filled[i] = o.text || '';
		});
		const correctIdxInSorted = sorted.findIndex((o) => o.isCorrect);
		const mappedCorrect = correctIdxInSorted >= 0 && correctIdxInSorted < 4 ? correctIdxInSorted : 0;

		setQModalError('');
		setQModal({
			isOpen: true,
			mode: 'edit',
			questionId: q.id,
			text: q.text || '',
			options: filled,
			correctIndex: mappedCorrect,
		});
	};

	const closeQuestionModal = () => {
		setQModal((s) => ({ ...s, isOpen: false }));
		setQModalError('');
	};

	const handleSaveQuestion = async () => {
		setQModalError('');
		if (!qModal.text.trim()) {
			setQModalError('Please enter the question text.');
			return;
		}
		const { options, error } = buildPayloadOptions(qModal.options, qModal.correctIndex);
		if (error) {
			setQModalError(error);
			return;
		}

		setIsSavingQuestion(true);
		try {
			const qz = await getOrCreateQuiz();
			if (qModal.mode === 'add') {
				await addQuestion(qz.id, { text: qModal.text.trim(), options });
			} else {
				await updateQuestion(qModal.questionId, {
					text: qModal.text.trim(),
					options,
				});
			}
			await refreshQuiz();
			setLastSavedAt(Date.now());
			showSuccess(qModal.mode === 'add' ? 'Question added' : 'Question updated');
			closeQuestionModal();
		} catch (e) {
			const m = String(e);
			setQModalError(m);
			showError(m);
		} finally {
			setIsSavingQuestion(false);
		}
	};

	const handleDeleteQuestion = async (q) => {
		const ok = await confirmAction('Delete question?', 'This cannot be undone.');
		if (!ok) {
			return;
		}
		setSectionError('');
		try {
			await deleteQuestion(q.id);
			await refreshQuiz();
			setLastSavedAt(Date.now());
			showSuccess('Question removed');
		} catch (e) {
			const m = String(e);
			setSectionError(m);
			showError(m);
		}
	};

	const questions = Array.isArray(quiz?.questions) ? [...quiz.questions] : [];
	questions.sort((a, b) => (a.id || 0) - (b.id || 0));
	const questionsCount = questions.length;

	if (isLoading) {
		return (
			<div className="quiz-page">
				<div className="quiz-center-spinner" style={{ minHeight: 'calc(100vh - 64px)' }}>
					<div className="spinner" />
				</div>
			</div>
		);
	}

	if (loadError) {
		return (
			<div className="quiz-page page-fade">
				<div className="quiz-main">
					<div className="quiz-main-inner" style={{ maxWidth: 560 }}>
						<p style={{ color: 'var(--error)' }}>{loadError}</p>
						<Link to="/instructor" className="btn-secondary" style={{ marginTop: 16, display: 'inline-flex' }}>
							Back to dashboard
						</Link>
					</div>
				</div>
			</div>
		);
	}

	return (
		<>
			<div className="quiz-page page-fade">
				<header className="quiz-topbar">
				<div className="quiz-topbar-inner">
					<Link
						className="quiz-back-link"
						to={`/instructor/courses/${courseId}/build`}
					>
						<svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
							<path
								d="M12.5 15.5L6.5 10L12.5 4.5"
								stroke="currentColor"
								strokeWidth="1.75"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
						Back to Content Builder
					</Link>
					<div className="quiz-topbar-meta">
						{lastSavedAt ? (
							<span className="quiz-saved-text" key={tick}>
								Last saved {formatRelativeSaved(lastSavedAt)}
							</span>
						) : (
							<span className="quiz-saved-text">Not saved yet</span>
						)}
						<button
							type="button"
							className="btn-secondary btn-sm"
							onClick={() => {
								if (!quiz?.id) {
									showError('Save the quiz (title and passing score) to open preview.');
									return;
								}
								setIsPreviewOpen(true);
							}}
						>
							Preview
						</button>
					</div>
				</div>
			</header>

			<main className="quiz-main">
				<div className="quiz-main-inner">
					<div>
						<h1 className="quiz-hero-title">
							Create Quiz for: {moduleTitle}
						</h1>
						<p className="quiz-hero-sub" style={{ marginTop: 8 }}>
							Configure your assessment settings and questions below.
						</p>
					</div>

					{sectionError ? (
						<p style={{ color: 'var(--error)', fontSize: 14, margin: 0 }} role="alert">
							{sectionError}
						</p>
					) : null}

					<div className="card quiz-surface quiz-settings-row" style={{ padding: 24 }}>
						<div className="quiz-field">
							<label className="label" htmlFor="qb-quiz-title">
								Quiz Title
							</label>
							<input
								id="qb-quiz-title"
								type="text"
								className="input"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								placeholder="e.g. Module 1 Quiz"
							/>
						</div>
						<div className="quiz-field">
							<label className="label" htmlFor="qb-passing">
								Passing Score (%)
							</label>
							<input
								id="qb-passing"
								type="number"
								min={0}
								max={100}
								className="input"
								value={passingScore === '' || passingScore === undefined || passingScore === null ? '' : passingScore}
								onChange={(e) => {
									const v = e.target.value;
									if (v === '') {
										setPassingScore('');
										return;
									}
									const n = parseInt(v, 10);
									if (!Number.isNaN(n)) {
										setPassingScore(n);
									}
								}}
							/>
						</div>
					</div>

					<div className="questions-header">
						<div className="questions-title">Questions</div>
						<div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
							{isQuizPublished ? (
								<span className="badge badge-beginner" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 13 }}>
									Published
								</span>
							) : (
								<span className="badge badge-gray" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 13 }}>
									Draft
								</span>
							)}
							<div className="questions-count-pill">
								{questionsCount} {questionsCount === 1 ? 'question' : 'questions'} added
							</div>
						</div>
					</div>

					<div className="questions-list">
						{questions.map((q, idx) => (
							<div className="card quiz-surface quiz-question-card" key={q.id} style={{ padding: 24 }}>
								<div className="quiz-question-head">
									<div className="quiz-question-left">
										<div className="quiz-q-index">Q{idx + 1}</div>
										<div>
											<div className="quiz-question-text">{q.text}</div>
										</div>
									</div>
									<div className="quiz-question-actions">
										<button type="button" className="quiz-question-btn" onClick={() => openEditQuestion(q)}>
											Edit
										</button>
										<button
											type="button"
											className="quiz-question-btn quiz-icon-trash"
											aria-label="Delete question"
											onClick={() => handleDeleteQuestion(q)}
										>
											<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
												<path
													d="M3.5 4H12.5M6.5 6.5V11.5M9.5 6.5V11.5M4.5 4V12.5C4.5 13.05 4.95 13.5 5.5 13.5H10.5C11.05 13.5 11.5 13.05 11.5 12.5V4M5.5 4V2.5C5.5 1.95 5.95 1.5 6.5 1.5H9.5C10.05 1.5 10.5 1.95 10.5 2.5V4"
													stroke="currentColor"
													strokeWidth="1.2"
													strokeLinecap="round"
												/>
											</svg>
										</button>
									</div>
								</div>
								<div className="quiz-mcq-block">
									{(q.options || [])
										.slice()
										.sort((a, b) => (a.id || 0) - (b.id || 0))
										.map((o) => (
											<div
												key={o.id}
												className={`quiz-mcq-option${o.isCorrect ? ' quiz-mcq-option--correct' : ''}`}
											>
												<div className="quiz-mcq-option-left">
													{o.isCorrect ? (
														<div className="quiz-radio quiz-radio--on" aria-label="Correct">
															<svg width="10" height="8" viewBox="0 0 10 8" fill="none">
																<path
																	d="M1 4L3.5 6.5L9 1"
																	stroke="var(--bg-surface)"
																	strokeWidth="1.8"
																	strokeLinecap="round"
																	strokeLinejoin="round"
																/>
															</svg>
														</div>
													) : (
														<div className="quiz-radio" aria-hidden />
													)}
													{looksLikeCodeSnippet(o.text) ? (
														<span className="quiz-option-code">{o.text}</span>
													) : (
														<span className="quiz-mcq-text">{o.text}</span>
													)}
												</div>
												{o.isCorrect ? (
													<span className="badge badge-beginner">Correct</span>
												) : null}
											</div>
										))}
								</div>
							</div>
						))}
					</div>

					<button type="button" className="quiz-add-question" onClick={openAddQuestion}>
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
							<path
								d="M10 4.5V15.5M4.5 10H15.5"
								stroke="currentColor"
								strokeWidth="1.8"
								strokeLinecap="round"
							/>
						</svg>
						Add Question
					</button>

					<div className="quiz-footer-wrap">
						<div className="quiz-sticky-footer">
							<button
								type="button"
								className="btn-secondary quiz-footer-btn"
								style={{ padding: '12px 24px' }}
								onClick={() => navigate(`/instructor/courses/${courseId}/build`)}
							>
								Cancel
							</button>
							{isQuizPublished ? (
								<span
									className="badge badge-beginner"
									style={{ textTransform: 'none', letterSpacing: 0, padding: '10px 16px', fontSize: 14, fontWeight: 600 }}
								>
									Quiz published
								</span>
							) : (
								<button
									type="button"
									className="btn-primary-blue quiz-footer-btn"
									style={{ padding: '12px 24px' }}
									onClick={handlePublishQuiz}
									disabled={isPublishing || !quiz?.id || questionsCount < 1}
									title={!quiz?.id ? 'Save the quiz first' : questionsCount < 1 ? 'Add a question to publish' : 'Publish to course'}
								>
									{isPublishing ? 'Publishing…' : 'Publish Quiz'}
								</button>
							)}
							<button
								type="button"
								className="btn-primary quiz-footer-btn"
								style={{ padding: '12px 24px' }}
								disabled={isSavingQuiz}
								onClick={handleSaveQuiz}
							>
								<svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
									<path
										d="M4.5 4.5H13.5L15.5 6.5V15.5H4.5V4.5Z"
										stroke="currentColor"
										strokeWidth="1.3"
									/>
									<path d="M4.5 4.5V2.5H12.2L15.5 5.5H4.5V4.5Z" fill="currentColor" />
								</svg>
								{isSavingQuiz ? 'Saving…' : 'Save Quiz'}
							</button>
						</div>
					</div>
				</div>
			</main>
			</div>

			{qModal.isOpen ? (
				<div
					className="quiz-modal-overlay"
					role="dialog"
					aria-modal
					aria-labelledby="q-modal-title"
					onClick={(e) => {
						if (e.target === e.currentTarget) {
							closeQuestionModal();
						}
					}}
					onKeyDown={(e) => {
						if (e.key === 'Escape') {
							closeQuestionModal();
						}
					}}
				>
					<div
						className="card quiz-modal"
						role="document"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="quiz-modal__accent" aria-hidden />
						<div className="quiz-modal__body">
						<h2 id="q-modal-title">{qModal.mode === 'add' ? 'Add question' : 'Edit question'}</h2>
						<label className="label" htmlFor="q-text">
							Question
						</label>
						<textarea
							id="q-text"
							className="input"
							rows={3}
							value={qModal.text}
							onChange={(e) => setQModal((s) => ({ ...s, text: e.target.value }))}
							placeholder="Enter your question"
						/>
						<p className="label" style={{ marginTop: 16, marginBottom: 8 }}>
							Answer options (2–4 non-empty) — one must be correct
						</p>
						<div className="quiz-options-editor">
							{[0, 1, 2, 3].map((i) => (
								<div key={i} className="quiz-option-row">
									<input
										type="radio"
										name="correctOpt"
										checked={qModal.correctIndex === i}
										onChange={() => setQModal((s) => ({ ...s, correctIndex: i }))}
										aria-label={`Mark option ${i + 1} as correct`}
									/>
									<input
										type="text"
										className="input"
										value={qModal.options[i]}
										onChange={(e) => {
											const v = e.target.value;
											setQModal((s) => {
												const next = [...s.options];
												next[i] = v;
												return { ...s, options: next };
											});
										}}
										placeholder={`Option ${i + 1}`}
									/>
								</div>
							))}
						</div>
						{qModalError ? (
							<p style={{ color: 'var(--error)', fontSize: 14, marginTop: 12 }} role="alert">
								{qModalError}
							</p>
						) : null}
						<div className="quiz-modal-actions">
							<button type="button" className="btn-secondary" onClick={closeQuestionModal}>
								Close
							</button>
							<button
								type="button"
								className="btn-primary"
								onClick={handleSaveQuestion}
								disabled={isSavingQuestion}
							>
								{isSavingQuestion ? 'Saving…' : qModal.mode === 'add' ? 'Save question' : 'Update question'}
							</button>
						</div>
						</div>
					</div>
				</div>
			) : null}

			{isPreviewOpen && quiz ? (
				<div
					className="quiz-modal-overlay"
					role="dialog"
					aria-modal
					aria-labelledby="pv-title"
					onClick={(e) => {
						if (e.target === e.currentTarget) {
							setIsPreviewOpen(false);
						}
					}}
					onKeyDown={(e) => {
						if (e.key === 'Escape') {
							setIsPreviewOpen(false);
						}
					}}
				>
					<div
						className="card quiz-modal quiz-modal--wide"
						role="document"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="quiz-modal__accent" aria-hidden />
						<div className="quiz-modal__body">
						<h2 id="pv-title">{quiz.title}</h2>
						<p className="quiz-hero-sub" style={{ marginTop: 8, marginBottom: 16 }}>
							Pass mark: {quiz.passingScore}%
						</p>
						{questionsCount === 0 ? (
							<p style={{ color: 'var(--text-muted)' }}>No questions yet. Add some from the editor.</p>
						) : (
							<ol style={{ margin: 0, paddingLeft: 20, color: 'var(--text-body)' }}>
								{questions.map((q) => (
									<li key={q.id} style={{ marginBottom: 12 }}>
										{q.text}
									</li>
								))}
							</ol>
						)}
						<div className="quiz-modal-actions" style={{ marginTop: 24 }}>
							<button type="button" className="btn-primary" onClick={() => setIsPreviewOpen(false)}>
								Close
							</button>
						</div>
						</div>
					</div>
				</div>
			) : null}
		</>
	);
};

export default QuizBuilder;
