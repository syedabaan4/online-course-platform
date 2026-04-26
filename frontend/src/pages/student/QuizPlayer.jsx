import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { generateCertificate } from '../../api/certificate.api';
import { getCourseById } from '../../api/course.api';
import { getMyAttempts, getQuizById, submitAttempt } from '../../api/quiz.api';
import { showError, showSuccess } from '../../components/Toast';

const normalizePayload = (payload) => payload?.data ?? payload;

const font = { fontFamily: 'var(--font)' };

function sortModulesList(c) {
	if (!c?.modules) {
		return [];
	}
	return [...c.modules].sort((a, b) => (a.order || 0) - (b.order || 0));
}

function sortQuestions(questions) {
	if (!Array.isArray(questions)) {
		return [];
	}
	return [...questions].sort((a, b) => a.id - b.id);
}

function getOptionText(question, optionId) {
	if (optionId == null) {
		return '—';
	}
	return question?.options?.find((o) => o.id === optionId)?.text ?? '—';
}

const QuizPlayer = () => {
	const { courseId: courseIdParam, quizId: quizIdParam } = useParams();
	const navigate = useNavigate();
	const courseId = parseInt(courseIdParam, 10);
	const quizId = parseInt(quizIdParam, 10);

	const [course, setCourse] = useState(null);
	const [quiz, setQuiz] = useState(null);
	const [view, setView] = useState('info');
	const [answers, setAnswers] = useState({});
	const [result, setResult] = useState(null);
	const [attempts, setAttempts] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [loadError, setLoadError] = useState('');
	const [attemptsError, setAttemptsError] = useState('');
	const [submitModalOpen, setSubmitModalOpen] = useState(false);
	const [certLoading, setCertLoading] = useState(false);

	const sortedModules = useMemo(() => sortModulesList(course), [course]);

	const sortedQuestions = useMemo(() => sortQuestions(quiz?.questions), [quiz]);

	const moduleIndex0 = useMemo(() => {
		if (!course?.modules || !quiz) {
			return -1;
		}
		return sortedModules.findIndex((m) => m.quiz?.id === quiz.id);
	}, [course, quiz, sortedModules]);

	const totalQuestions = sortedQuestions.length;

	const answeredCount = useMemo(
		() => sortedQuestions.filter((q) => answers[q.id] != null).length,
		[sortedQuestions, answers]
	);

	const progressPct = useMemo(
		() => (totalQuestions ? Math.min(100, (answeredCount / totalQuestions) * 100) : 0),
		[answeredCount, totalQuestions]
	);

	const attemptsSorted = useMemo(() => {
		if (!Array.isArray(attempts) || !attempts.length) {
			return [];
		}
		return [...attempts].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
	}, [attempts]);

	const allAnswered = totalQuestions > 0 && answeredCount === totalQuestions;

	const loadData = useCallback(async () => {
		if (!Number.isFinite(courseId) || courseId < 1 || !Number.isFinite(quizId) || quizId < 1) {
			setLoadError('Invalid link.');
			setIsLoading(false);
			return;
		}
		setIsLoading(true);
		setLoadError('');
		setAttemptsError('');
		try {
			const qRes = await getQuizById(quizId);
			const q = normalizePayload(qRes);
			if (!q?.id) {
				setLoadError('Quiz not found.');
				setQuiz(null);
				setCourse(null);
				return;
			}
			const cRes = await getCourseById(courseId);
			const c = normalizePayload(cRes);
			if (!c?.modules) {
				setLoadError('Course not found.');
				setQuiz(null);
				setCourse(null);
				return;
			}
			const inCourse = c.modules?.some((m) => m.quiz?.id === q.id);
			if (!inCourse) {
				setLoadError('This quiz is not part of the selected course.');
				setQuiz(null);
				setCourse(null);
				return;
			}
			setCourse(c);
			setQuiz(q);
			const qList = sortQuestions(q.questions);
			setAnswers(
				qList.reduce(
					(acc, question) => ({
						...acc,
						[question.id]: null,
					}),
					{}
				)
			);
			setView('info');
			setResult(null);
			try {
				const aRes = await getMyAttempts(quizId);
				const list = normalizePayload(aRes);
				setAttempts(Array.isArray(list) ? list : []);
			} catch (e) {
				setAttemptsError(String(e));
				setAttempts([]);
			}
		} catch (e) {
			setLoadError(String(e));
			setQuiz(null);
			setCourse(null);
		} finally {
			setIsLoading(false);
		}
	}, [courseId, quizId]);

	useEffect(() => {
		const t = setTimeout(() => {
			void loadData();
		}, 0);
		return () => clearTimeout(t);
	}, [loadData]);

	const setAnswer = (questionId, optionId) => {
		setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
	};

	const startTaking = () => {
		if (!quiz) {
			return;
		}
		const qList = sortQuestions(quiz.questions);
		setAnswers(
			qList.reduce(
				(acc, question) => ({
					...acc,
					[question.id]: null,
				}),
				{}
			)
		);
		setView('taking');
	};

	const openSubmitModal = () => {
		if (!allAnswered) {
			showError('Please answer every question before submitting.');
			return;
		}
		setSubmitModalOpen(true);
	};

	const performSubmit = async () => {
		if (!sortedQuestions.length || !allAnswered) {
			return;
		}
		setIsSubmitting(true);
		setSubmitModalOpen(false);
		try {
			const payload = sortedQuestions.map((q) => ({
				questionId: q.id,
				selectedOptionId: answers[q.id],
			}));
			const res = await submitAttempt(quizId, payload);
			const data = normalizePayload(res);
			setResult(data);
			setView('results');
			showSuccess('Attempt submitted.');
			try {
				const aRes = await getMyAttempts(quizId);
				const list = normalizePayload(aRes);
				setAttempts(Array.isArray(list) ? list : []);
			} catch {
				// ignore
			}
		} catch (e) {
			showError(String(e));
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleRetakeToInfo = async () => {
		try {
			const aRes = await getMyAttempts(quizId);
			const list = normalizePayload(aRes);
			setAttempts(Array.isArray(list) ? list : []);
		} catch (e) {
			setAttemptsError(String(e));
		}
		if (quiz) {
			const qList = sortQuestions(quiz.questions);
			setAnswers(
				qList.reduce(
					(acc, question) => ({
						...acc,
						[question.id]: null,
					}),
					{}
				)
			);
		}
		setResult(null);
		setView('info');
	};

	const handleGetCertificate = async () => {
		if (!Number.isFinite(courseId)) {
			return;
		}
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
					padding: 24,
				}}
			>
				<div className="spinner" />
			</main>
		);
	}

	if (loadError || !quiz || !course) {
		return (
			<main
				className="page-fade"
				style={{ ...font, minHeight: 'calc(100vh - 64px)', padding: 48, background: 'var(--bg-primary)' }}
			>
				<h1 style={{ color: 'var(--text-primary)', fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Unable to load quiz</h1>
				<p style={{ color: 'var(--error)', marginBottom: 20 }}>{loadError || 'This quiz is unavailable.'}</p>
				<Link to={Number.isFinite(courseId) ? `/learn/${courseId}` : '/my-courses'} className="btn-secondary" style={{ display: 'inline-flex' }}>
					{Number.isFinite(courseId) ? 'Back to course' : 'My Learning'}
				</Link>
			</main>
		);
	}

	if (!quiz.isPublished) {
		return (
			<main
				className="page-fade"
				style={{ ...font, minHeight: 'calc(100vh - 64px)', padding: 48, background: 'var(--bg-primary)' }}
			>
				<h1 style={{ color: 'var(--text-primary)', fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Quiz not available</h1>
				<p style={{ color: 'var(--error)', marginBottom: 20 }}>This quiz is not published yet.</p>
				<Link to={`/learn/${courseId}`} className="btn-secondary" style={{ display: 'inline-flex' }}>
					Back to course
				</Link>
			</main>
		);
	}

	if (totalQuestions === 0) {
		return (
			<main
				className="page-fade"
				style={{ ...font, minHeight: 'calc(100vh - 64px)', padding: 48, background: 'var(--bg-primary)' }}
			>
				<h1 style={{ color: 'var(--text-primary)', fontSize: 24, fontWeight: 800, marginBottom: 8 }}>No questions</h1>
				<p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>This quiz has no questions yet.</p>
				<Link to={`/learn/${courseId}`} className="btn-secondary" style={{ display: 'inline-flex' }}>
					Back to course
				</Link>
			</main>
		);
	}

	return (
		<div className="page-fade" style={{ ...font, minHeight: 'calc(100vh - 64px)', background: 'var(--bg-primary)' }}>
			{view === 'info' && (
				<InfoView
					quiz={quiz}
					attemptsSorted={attemptsSorted}
					attemptsError={attemptsError}
					totalQuestions={totalQuestions}
					moduleIndex0={moduleIndex0}
					onStart={() => startTaking()}
					courseId={courseId}
				/>
			)}

			{view === 'taking' && (
				<TakingView
					quiz={quiz}
					courseId={courseId}
					sortedQuestions={sortedQuestions}
					answers={answers}
					setAnswer={setAnswer}
					answeredCount={answeredCount}
					totalQuestions={totalQuestions}
					progressPct={progressPct}
					moduleIndex0={moduleIndex0}
					onOpenSubmit={openSubmitModal}
					isSubmitting={isSubmitting}
					allAnswered={allAnswered}
				/>
			)}

			{view === 'results' && result && (
				<ResultsView
					course={course}
					quiz={quiz}
					courseId={courseId}
					moduleIndex0={moduleIndex0}
					sortedQuestions={sortedQuestions}
					attemptsSorted={attemptsSorted}
					result={result}
					certLoading={certLoading}
					onGetCertificate={handleGetCertificate}
					onRetakeInfo={handleRetakeToInfo}
					onContinue={() => navigate(`/learn/${courseId}`)}
				/>
			)}

			{submitModalOpen && (
				<SubmitModal
					answeredCount={answeredCount}
					totalQuestions={totalQuestions}
					onBack={() => setSubmitModalOpen(false)}
					onConfirm={performSubmit}
					isSubmitting={isSubmitting}
				/>
			)}
		</div>
	);
};

function InfoView({ quiz, attemptsSorted, attemptsError, totalQuestions, moduleIndex0, onStart, courseId }) {
	const moduleLabel = moduleIndex0 >= 0 ? `Module ${moduleIndex0 + 1}` : 'Module';

	return (
		<div
			style={{
				maxWidth: 768,
				margin: '0 auto',
				padding: '32px 24px 64px',
				display: 'flex',
				flexDirection: 'column',
				gap: 24,
			}}
		>
			<div
				className="card"
				style={{
					borderRadius: 'var(--radius-xl)',
					display: 'flex',
					flexDirection: 'column',
					gap: 16,
					boxShadow: 'var(--shadow-card)',
					border: '1px solid var(--border)',
				}}
			>
				<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
					<div className="badge badge-blue" style={{ color: 'var(--text-primary)' }}>
						{moduleLabel}
					</div>
					<h1 style={{ color: 'var(--text-primary)', fontSize: 30, fontWeight: 900, lineHeight: 1.2, margin: 0 }}>{quiz.title}</h1>
				</div>
				<p style={{ color: 'var(--text-secondary)', fontSize: 16, margin: 0, lineHeight: 1.5 }}>
					{totalQuestions} {totalQuestions === 1 ? 'question' : 'questions'}
					{' · '}
					Passing score: {quiz.passingScore}%
				</p>
			</div>

			<div
				className="card"
				style={{
					borderRadius: 'var(--radius-xl)',
					padding: 0,
					overflow: 'hidden',
					boxShadow: 'var(--shadow-card)',
					border: '1px solid var(--border)',
				}}
			>
				<div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
					<h2 style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 700, margin: 0 }}>Your attempts</h2>
				</div>
				{attemptsError && (
					<div style={{ padding: '12px 24px', color: 'var(--error)', fontSize: 14 }}>{attemptsError}</div>
				)}
				{attemptsSorted.length ? (
					<div style={{ overflow: 'auto' }}>
						<table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
							<thead>
								<tr style={{ textAlign: 'left', color: 'var(--text-secondary)', background: 'var(--bg-surface-alt)' }}>
									<th style={{ padding: '12px 24px', fontWeight: 600 }}>Attempt #</th>
									<th style={{ padding: '12px 16px', fontWeight: 600 }}>Score</th>
									<th style={{ padding: '12px 16px', fontWeight: 600 }}>Pass / Fail</th>
									<th style={{ padding: '12px 24px', fontWeight: 600 }}>Date</th>
								</tr>
							</thead>
							<tbody>
								{attemptsSorted.map((a, i) => (
									<tr key={a.id} style={{ borderTop: '1px solid var(--border)' }}>
										<td style={{ padding: '12px 24px', color: 'var(--text-body)' }}>{i + 1}</td>
										<td style={{ padding: '12px 16px', color: 'var(--text-body)' }}>{Math.round(a.score * 10) / 10}%</td>
										<td style={{ padding: '12px 16px', color: a.passed ? 'var(--success)' : 'var(--error)' }}>
											{a.passed ? 'Pass' : 'Fail'}
										</td>
										<td style={{ padding: '12px 24px', color: 'var(--text-muted)' }}>
											{new Date(a.createdAt).toLocaleString()}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					!attemptsError && <div className="empty-state" style={{ minHeight: 120, padding: 32 }}>No attempts yet.</div>
				)}
			</div>

			<div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
				<button type="button" className="btn-primary" onClick={onStart}>
					{attemptsSorted.length > 0 ? 'Retake Quiz' : 'Start Quiz'}
				</button>
				<Link to={`/learn/${courseId}`} className="btn-secondary" style={{ display: 'inline-flex' }}>
					Back to course
				</Link>
			</div>
		</div>
	);
}

function TakingView({
	quiz,
	courseId,
	sortedQuestions,
	answers,
	setAnswer,
	answeredCount,
	totalQuestions,
	progressPct,
	moduleIndex0,
	onOpenSubmit,
	isSubmitting,
	allAnswered,
}) {
	const moduleLabel = moduleIndex0 >= 0 ? `Module ${moduleIndex0 + 1}` : 'Module';

	return (
		<div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 64px)' }}>
			<div
				style={{
					flex: 1,
					overflow: 'auto',
					padding: '32px 24px 24px',
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'flex-start',
				}}
			>
				<div
					style={{
						width: '100%',
						maxWidth: 768,
						display: 'flex',
						flexDirection: 'column',
						gap: 32,
					}}
				>
					<div
						style={{
							width: '100%',
							padding: 24,
							background: 'var(--bg-surface)',
							borderRadius: 'var(--radius-xl)',
							boxShadow: 'var(--shadow-card)',
							border: '1px solid var(--border)',
							display: 'flex',
							flexDirection: 'column',
							gap: 16,
						}}
					>
						<div style={{ display: 'flex', alignSelf: 'stretch', justifyContent: 'space-between', alignItems: 'flex-end' }}>
							<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
								<div
									className="badge badge-blue"
									style={{ color: 'var(--text-primary)', textTransform: 'uppercase' }}
								>
									{moduleLabel}
								</div>
								<div
									style={{
										color: 'var(--text-primary)',
										fontSize: 30,
										fontWeight: 900,
										lineHeight: '36px',
									}}
								>
									{quiz.title}
								</div>
							</div>
							<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
								<div style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 0, paddingBottom: 1 }}>
									<div style={{ color: 'var(--text-primary)', fontSize: 24, fontWeight: 700, lineHeight: '32px' }}>
										{answeredCount}
									</div>
									<div style={{ color: 'var(--text-secondary)', fontSize: 18, fontWeight: 400, lineHeight: '28px' }}>
										/{totalQuestions}
									</div>
								</div>
								<div
									style={{
										color: 'var(--text-secondary)',
										fontSize: 12,
										fontWeight: 500,
										textTransform: 'uppercase',
										letterSpacing: '0.6px',
									}}
								>
									Answered
								</div>
							</div>
						</div>
						<div
							className="progress-bar"
							style={{ height: 12, alignSelf: 'stretch', background: 'var(--bg-surface-alt)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}
						>
							<div
								className="progress-fill"
								style={{
									width: `${progressPct}%`,
									height: '100%',
									background: 'var(--text-primary)',
									borderRadius: 'var(--radius-pill)',
								}}
							/>
						</div>
					</div>

					{sortedQuestions.map((q, qi) => {
						const options = [...(q.options || [])].sort((a, b) => a.id - b.id);
						const isAnswered = answers[q.id] != null;

						return (
							<QuestionBlock
								key={q.id}
								qIndex={qi}
								question={q}
								options={options}
								selectedId={answers[q.id]}
								isAnswered={isAnswered}
								onSelect={(oid) => setAnswer(q.id, oid)}
							/>
						);
					})}

					<div style={{ height: 32, alignSelf: 'stretch' }} />
				</div>
			</div>

			<div
				style={{
					width: '100%',
					background: 'var(--bg-surface)',
					borderTop: '1px solid var(--border)',
					padding: '16px 24px',
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					flexShrink: 0,
					zIndex: 20,
					boxShadow: 'var(--shadow-footer-up)',
				}}
			>
				<div
					style={{
						width: '100%',
						maxWidth: 768,
						display: 'inline-flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						gap: 16,
						flexWrap: 'wrap',
					}}
				>
					<div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
						<InfoNoteIcon style={{ width: 15, height: 15, flexShrink: 0, color: 'var(--text-secondary)' }} />
						<span style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 400, lineHeight: '20px' }}>
							Please review your answers before submitting.
						</span>
					</div>
					<div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
						<Link
							to={`/learn/${courseId}`}
							className="btn-secondary"
							style={{ display: 'inline-flex', fontSize: 14, padding: '10px 16px' }}
						>
							Back
						</Link>
						<button
							type="button"
							className="btn-primary"
							onClick={onOpenSubmit}
							disabled={!allAnswered || isSubmitting}
							style={{ padding: '12px 40px', fontWeight: 700, margin: 0 }}
						>
							<span>Submit Quiz</span>
							<ArrowRightIcon size={12} color="var(--bg-surface)" />
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

function QuestionBlock({ qIndex, question, options, selectedId, isAnswered, onSelect }) {
	return (
		<div
			style={{
				width: '100%',
				padding: 32,
				background: 'var(--bg-surface)',
				borderRadius: 'var(--radius-xl)',
				boxShadow: 'var(--shadow-card)',
				border: '1px solid var(--border)',
				display: 'flex',
				flexDirection: 'column',
				gap: 24,
			}}
		>
			<div style={{ display: 'inline-flex', alignItems: 'flex-start', alignSelf: 'stretch', gap: 16 }}>
				<div
					style={{
						width: 32,
						height: 32,
						background: isAnswered ? 'var(--text-primary)' : 'var(--bg-elevated)',
						borderRadius: 'var(--radius-pill)',
						display: 'flex',
						justifyContent: 'center',
						alignItems: 'center',
						flexShrink: 0,
					}}
				>
					<div
						style={{
							color: isAnswered ? 'var(--bg-surface)' : 'var(--text-secondary)',
							fontSize: 14,
							fontWeight: 700,
							lineHeight: '20px',
						}}
					>
						{qIndex + 1}
					</div>
				</div>
				<div style={{ display: 'inline-flex', flex: 1, flexDirection: 'column', alignItems: 'flex-start', paddingTop: 4, minWidth: 0 }}>
					<div
						style={{
							color: 'var(--text-primary)',
							fontSize: 20,
							fontWeight: 600,
							lineHeight: '28px',
						}}
					>
						{question.text}
					</div>
				</div>
			</div>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					gap: 12,
					alignItems: 'stretch',
					width: '100%',
					paddingLeft: 48,
					boxSizing: 'border-box',
				}}
			>
				{options.map((o) => {
					const selected = selectedId === o.id;
					return (
						<button
							type="button"
							key={o.id}
							onClick={() => onSelect(o.id)}
							style={{
								width: '100%',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'flex-start',
								gap: selected ? 14 : 16,
								padding: selected ? '16px 16px 16px 14px' : 16,
								borderRadius: 'var(--radius-lg)',
								border: `1px solid ${selected ? 'var(--text-primary)' : 'var(--border)'}`,
								background: selected
									? 'color-mix(in srgb, var(--accent) 5%, var(--bg-surface))'
									: 'var(--bg-surface)',
								cursor: 'pointer',
								textAlign: 'left',
								position: 'relative',
								margin: 0,
								WebkitTapHighlightColor: 'transparent',
							}}
						>
							{selected ? (
								<div
									style={{
										width: 24,
										height: 24,
										borderRadius: 'var(--radius-2xl)',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										flexShrink: 0,
										boxShadow: 'var(--shadow-focus-ring-inset)',
									}}
								>
									<div
										style={{
											width: 7.5,
											height: 7.5,
											background: 'var(--text-primary)',
											borderRadius: 'var(--radius-pill)',
										}}
									/>
								</div>
							) : (
								<div
									style={{
										width: 20,
										height: 20,
										borderRadius: 'var(--radius-2xl)',
										border: '2px solid var(--border)',
										flexShrink: 0,
									}}
								/>
							)}
							<span
								style={{
									color: 'var(--text-primary)',
									fontSize: 16,
									fontWeight: 500,
									lineHeight: '24px',
									flex: 1,
									minWidth: 0,
								}}
							>
								{o.text}
							</span>
							{selected && (
								<div
									aria-hidden
									style={{ marginLeft: 'auto', flexShrink: 0, display: 'flex', alignItems: 'center', paddingLeft: 8 }}
								>
									<CheckIcon size={20} color="var(--text-primary)" />
								</div>
							)}
						</button>
					);
				})}
			</div>
		</div>
	);
}

function ResultsView({
	course,
	quiz,
	courseId,
	moduleIndex0,
	sortedQuestions,
	attemptsSorted,
	result,
	certLoading,
	onGetCertificate,
	onRetakeInfo,
	onContinue,
}) {
	const passed = result.passed;
	const correctCount = typeof result.correctCount === 'number' ? result.correctCount : 0;
	const totalQ = typeof result.totalQuestions === 'number' ? result.totalQuestions : sortedQuestions.length;
	const incorrectCount = Math.max(0, totalQ - correctCount);
	const scoreRounded = Math.round(result.score * 10) / 10;
	const passing = quiz?.passingScore ?? 0;
	const gapToPass = Math.max(0, Math.ceil(passing - scoreRounded));

	const moduleLabel = moduleIndex0 >= 0 ? `Module ${moduleIndex0 + 1}` : 'Module';
	const courseTitle = course?.title || 'Course';
	const pageTitle = `${moduleLabel} Quiz — Results`;

	const attemptId = result?.attempt?.id;
	const attemptNum = (() => {
		if (attemptId == null) {
			return attemptsSorted.length || 1;
		}
		const idx = attemptsSorted.findIndex((a) => a.id === attemptId);
		return idx >= 0 ? idx + 1 : attemptsSorted.length || 1;
	})();

	const completedAt = result?.attempt?.createdAt
		? new Date(result.attempt.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
		: new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

	const [showAll, setShowAll] = useState(false);

	const rowsOrdered = useMemo(() => {
		const breakdown = result.breakdown || [];
		return sortedQuestions
			.map((q) => breakdown.find((b) => b.questionId === q.id))
			.filter(Boolean);
	}, [sortedQuestions, result]);

	const previewN = 3;
	const hasMore = rowsOrdered.length > previewN;
	const visibleRows = !hasMore || showAll ? rowsOrdered : rowsOrdered.slice(0, previewN);

	return (
		<div
			style={{
				width: '100%',
				maxWidth: 960,
				margin: '0 auto',
				padding: '32px 24px 48px',
				display: 'flex',
				flexDirection: 'column',
				gap: 24,
			}}
		>
			<nav
				aria-label="Breadcrumb"
				style={{ display: 'inline-flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 500, lineHeight: '20px' }}
			>
				<Link to="/" style={{ color: 'var(--text-muted)' }}>
					Home
				</Link>
				<span style={{ color: 'var(--text-dim)' }}>/</span>
				<Link to={`/learn/${courseId}`} style={{ color: 'var(--text-muted)' }}>
					{courseTitle}
				</Link>
				<span style={{ color: 'var(--text-dim)' }}>/</span>
				<span style={{ color: 'var(--text-muted)' }}>{moduleLabel}</span>
				<span style={{ color: 'var(--text-dim)' }}>/</span>
				<span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Quiz Results</span>
			</nav>

			<header>
				<h1
					style={{
						color: 'var(--text-primary)',
						fontSize: 30,
						fontWeight: 700,
						lineHeight: '36px',
						margin: 0,
					}}
				>
					{pageTitle}
				</h1>
				<p style={{ color: 'var(--text-muted)', fontSize: 16, lineHeight: '24px', margin: '4px 0 0' }}>
					Attempt {attemptNum} completed on {completedAt}
				</p>
			</header>

			<div
				className="card"
				style={{
					borderRadius: 'var(--radius-lg)',
					padding: 0,
					overflow: 'hidden',
					boxShadow: 'var(--shadow-card)',
					border: '1px solid var(--border)',
				}}
			>
				{passed ? (
					<PassedBanner moduleLabel={moduleLabel} />
				) : (
					<FailedBanner />
				)}

				<div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 32 }}>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignSelf: 'stretch' }}>
						<div
							style={{
								display: 'inline-flex',
								alignSelf: 'stretch',
								justifyContent: 'space-between',
								alignItems: 'flex-end',
								flexWrap: 'wrap',
								gap: 16,
							}}
						>
							<div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
								<div
									style={{
										color: 'var(--text-muted)',
										fontSize: 14,
										fontWeight: 500,
										textTransform: 'uppercase',
										letterSpacing: '0.7px',
										lineHeight: '20px',
									}}
								>
									Your score
								</div>
								<div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '4px 8px' }}>
									<span
										style={{
											color: 'var(--text-primary)',
											fontSize: 36,
											fontWeight: passed ? 700 : 900,
											lineHeight: '40px',
										}}
									>
										{scoreRounded}%
									</span>
									<span
										style={{
											color: 'var(--text-dim)',
											fontSize: 18,
											fontWeight: 500,
											lineHeight: '28px',
										}}
									>
										({correctCount}/{totalQ} Correct)
									</span>
								</div>
							</div>
							<div style={{ textAlign: 'right' }}>
								<span style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>Passing Score: </span>
								<span style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 700 }}>{passing}%</span>
							</div>
						</div>

						<div
							aria-hidden
							style={{
								height: 16,
								alignSelf: 'stretch',
								background: 'var(--bg-elevated)',
								borderRadius: 'var(--radius-pill)',
								overflow: 'hidden',
								position: 'relative',
							}}
						>
							<div
								style={{
									position: 'absolute',
									left: 0,
									top: 0,
									width: `${Math.min(100, scoreRounded)}%`,
									height: '100%',
									background: passed ? 'var(--success)' : 'var(--error)',
									borderRadius: 'var(--radius-pill)',
									zIndex: 0,
								}}
							/>
							<div
								style={{
									position: 'absolute',
									left: `clamp(0px, ${passing}%, calc(100% - 2px))`,
									top: 0,
									width: 2,
									height: '100%',
									background: 'var(--text-dim)',
									zIndex: 1,
									pointerEvents: 'none',
								}}
							/>
						</div>

						{!passed && (
							<div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
								<WarningSmallIcon color="var(--error)" />
								<span style={{ color: 'var(--error)', fontSize: 12, fontWeight: 500, lineHeight: '16px' }}>
									You need {gapToPass}% more to pass this module.
								</span>
							</div>
						)}
					</div>

					<div
						style={{
							paddingTop: 16,
							borderTop: '1px solid var(--border-light)',
							display: 'inline-flex',
							alignSelf: 'stretch',
							justifyContent: 'center',
							alignItems: 'center',
							gap: 16,
							flexWrap: 'wrap',
						}}
					>
						<Link
							to={`/learn/${courseId}`}
							style={{
								display: 'inline-flex',
								alignItems: 'center',
								gap: 8,
								padding: '10px 24px',
								borderRadius: 'var(--radius)',
								color: 'var(--text-body)',
								fontSize: 16,
								fontWeight: 500,
								lineHeight: '24px',
							}}
						>
							<ArrowBackIcon size={12} color="var(--text-body)" />
							Back to Course
						</Link>
						{passed ? (
							<>
								<button
									type="button"
									className="btn-secondary"
									onClick={onGetCertificate}
									disabled={certLoading}
									style={{ fontSize: 14, padding: '10px 20px' }}
								>
									{certLoading ? '…' : 'Get Certificate'}
								</button>
								<button
									type="button"
									className="btn-primary"
									onClick={onContinue}
									style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, padding: '13px 24px' }}
								>
									Continue to Next
									<ArrowRightIcon size={12} color="var(--bg-surface)" />
								</button>
							</>
						) : (
							<button
								type="button"
								className="btn-primary"
								onClick={onRetakeInfo}
								style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 700, padding: '10px 32px' }}
							>
								<RetakeIcon size={12} color="var(--bg-surface)" />
								Retake Quiz
							</button>
						)}
					</div>
				</div>
			</div>

			<div
				style={{
					paddingTop: 16,
					display: 'inline-flex',
					alignSelf: 'stretch',
					justifyContent: 'space-between',
					alignItems: 'center',
					flexWrap: 'wrap',
					gap: 12,
				}}
			>
				<h2 style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 700, lineHeight: '28px', margin: 0 }}>Question Breakdown</h2>
				<div style={{ display: 'inline-flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
					<div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
						<Swatch color="var(--success)" />
						<span style={{ color: 'var(--success)', fontSize: 14, fontWeight: 500, lineHeight: '20px' }}>Correct ({correctCount})</span>
					</div>
					<div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
						<Swatch color="var(--error)" />
						<span style={{ color: 'var(--error)', fontSize: 14, fontWeight: 500, lineHeight: '20px' }}>Incorrect ({incorrectCount})</span>
					</div>
				</div>
			</div>

			{visibleRows.map((row) => {
				const q = sortedQuestions.find((x) => x.id === row.questionId);
				if (!q) {
					return null;
				}
				const qNum = rowsOrdered.findIndex((r) => r.questionId === row.questionId) + 1;
				return <QuestionResultCard key={row.questionId} index={qNum} question={q} row={row} />;
			})}

			{hasMore && (
				<div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
					<button
						type="button"
						onClick={() => setShowAll((s) => !s)}
						style={{
							display: 'inline-flex',
							alignItems: 'center',
							gap: 6,
							background: 'none',
							border: 'none',
							cursor: 'pointer',
							color: 'var(--text-primary)',
							fontSize: 14,
							fontWeight: 500,
							lineHeight: '20px',
							fontFamily: 'var(--font)',
						}}
					>
						{showAll ? 'Show less' : `Show All ${rowsOrdered.length} Questions`}
						<ChevronIcon down={!showAll} size={12} color="var(--text-primary)" />
					</button>
				</div>
			)}
		</div>
	);
}

function PassedBanner({ moduleLabel }) {
	return (
		<div
			style={{
				padding: 24,
				background: 'color-mix(in srgb, var(--success) 6%, var(--bg-surface))',
				borderBottom: '1px solid var(--border-light)',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				gap: 12,
			}}
		>
			<div
				style={{
					width: 64,
					height: 64,
					borderRadius: 'var(--radius-pill)',
					background: 'color-mix(in srgb, var(--success) 12%, var(--bg-surface))',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
				}}
			>
				<PartyIcon size={32} color="var(--success)" />
			</div>
			<div style={{ textAlign: 'center', maxWidth: 448 }}>
				<div style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 700, lineHeight: '28px', marginBottom: 4 }}>You Passed!</div>
				<div style={{ color: 'var(--text-muted)', fontSize: 16, lineHeight: '24px' }}>
					Great job! You’ve mastered the basics of {moduleLabel}.
				</div>
			</div>
		</div>
	);
}

function FailedBanner() {
	return (
		<div
			style={{
				padding: 24,
				background: 'color-mix(in srgb, var(--error) 8%, var(--bg-surface))',
				borderBottom: '1px solid var(--border-light)',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				gap: 12,
			}}
		>
			<div
				style={{
					width: 64,
					height: 64,
					borderRadius: 'var(--radius-pill)',
					background: 'color-mix(in srgb, var(--error) 10%, var(--bg-surface))',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
				}}
			>
				<FailXIcon size={24} color="var(--error)" />
			</div>
			<div style={{ textAlign: 'center', maxWidth: 448 }}>
				<div style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 700, lineHeight: '28px', marginBottom: 4 }}>You Did Not Pass</div>
				<div style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: '20px' }}>
					Don’t worry, mastering new concepts takes time. Review your
					<br />
					answers below and try again to earn your certificate.
				</div>
			</div>
		</div>
	);
}

function QuestionResultCard({ index, question, row }) {
	const isCorrect = row.isCorrect;
	const yourText = getOptionText(question, row.selectedOptionId);
	const correctText = getOptionText(question, row.correctOptionId);

	return (
		<div
			style={{
				padding: 24,
				background: 'var(--bg-surface)',
				borderRadius: 'var(--radius)',
				border: '1px solid var(--border)',
				display: 'inline-flex',
				alignSelf: 'stretch',
				gap: 16,
			}}
		>
			<div style={{ paddingTop: 4, flexShrink: 0 }}>{isCorrect ? <CheckMarkIcon size={20} color="var(--success)" /> : <XMarkIcon size={20} color="var(--error)" />}</div>
			<div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
				<div style={{ display: 'inline-flex', alignSelf: 'stretch', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
					<div style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 600, lineHeight: '24px' }}>Question {index}</div>
					{isCorrect ? (
						<span className="badge badge-published" style={{ fontSize: 12, fontWeight: 700, textTransform: 'none', letterSpacing: '0' }}>
							1/1 Points
						</span>
					) : (
						<span className="badge badge-advanced" style={{ fontSize: 12, fontWeight: 700, textTransform: 'none', letterSpacing: '0' }}>
							0/1 Points
						</span>
					)}
				</div>
				<div style={{ color: 'var(--text-body)', fontSize: 14, lineHeight: '20px' }}>{question.text}</div>

				{isCorrect ? (
					<AnswerRowCorrect text={yourText} />
				) : (
					<>
						<AnswerRowWrong text={yourText} />
						<AnswerRowCorrectLabel text={correctText} wrongRadio />
					</>
				)}

				{!isCorrect && (
					<div
						style={{
							padding: 12,
							background: 'var(--bg-surface-alt)',
							borderRadius: 'var(--radius-sm)',
						}}
					>
						<div style={{ color: 'var(--text-secondary)', fontSize: 12, lineHeight: '20px' }}>
							<span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Explanation: </span>
							<WrongAnswerExplanation yourText={yourText} correctText={correctText} />
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

function WrongAnswerExplanation({ yourText, correctText }) {
	return (
		<span>
			The correct answer is <code style={{ fontFamily: 'var(--font)' }}>{correctText}</code>. Review the lesson and compare with your
			selection: <code style={{ fontFamily: 'var(--font)' }}>{yourText}</code>
			{yourText === '—' ? ' (unanswered)' : ''}.
		</span>
	);
}

function AnswerRowCorrect({ text }) {
	return (
		<div
			style={{
				padding: 12,
				background: 'color-mix(in srgb, var(--success) 6%, var(--bg-surface))',
				borderRadius: 'var(--radius-sm)',
				border: '1px solid color-mix(in srgb, var(--success) 40%, var(--border))',
				display: 'inline-flex',
				alignSelf: 'stretch',
				justifyContent: 'space-between',
				alignItems: 'center',
			}}
		>
			<div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
				<div
					style={{
						width: 16,
						height: 16,
						borderRadius: 'var(--radius-pill)',
						background: 'var(--success)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
					}}
				>
					<MiniCheckIcon />
				</div>
				<span style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 500, lineHeight: '20px' }}>{text}</span>
			</div>
			<span style={{ color: 'var(--success)', fontSize: 12, fontWeight: 500, lineHeight: '16px', textTransform: 'uppercase' }}>Correct</span>
		</div>
	);
}

function AnswerRowWrong({ text }) {
	return (
		<div
			style={{
				padding: 12,
				background: 'color-mix(in srgb, var(--error) 5%, var(--bg-surface))',
				borderRadius: 'var(--radius-sm)',
				border: '1px solid color-mix(in srgb, var(--error) 28%, var(--border))',
				display: 'inline-flex',
				alignSelf: 'stretch',
				justifyContent: 'space-between',
				alignItems: 'center',
			}}
		>
			<div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
				<div
					style={{
						width: 16,
						height: 16,
						borderRadius: 'var(--radius-pill)',
						background: 'color-mix(in srgb, var(--error) 50%, var(--bg-surface))',
						border: '1px solid color-mix(in srgb, var(--error) 50%, var(--bg-surface))',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
					}}
				>
					<div
						style={{
							width: 6,
							height: 6,
							borderRadius: 'var(--radius-pill)',
							background: 'var(--bg-surface)',
						}}
					/>
				</div>
				<span style={{ color: 'var(--text-body)', fontSize: 14, lineHeight: '20px' }}>{text}</span>
			</div>
			<span style={{ color: 'var(--error)', fontSize: 12, fontWeight: 500, lineHeight: '16px', textTransform: 'uppercase' }}>Your answer</span>
		</div>
	);
}

function AnswerRowCorrectLabel({ text, wrongRadio }) {
	return (
		<div
			style={{
				padding: 12,
				background: 'color-mix(in srgb, var(--success) 6%, var(--bg-surface))',
				borderRadius: 'var(--radius-sm)',
				border: '1px solid color-mix(in srgb, var(--success) 40%, var(--border))',
				display: 'inline-flex',
				alignSelf: 'stretch',
				justifyContent: 'space-between',
				alignItems: 'center',
			}}
		>
			<div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
				{wrongRadio ? (
					<div
						style={{
							width: 16,
							height: 16,
							borderRadius: 'var(--radius-pill)',
							border: '1px solid var(--success)',
						}}
					/>
				) : (
					<div
						style={{
							width: 16,
							height: 16,
							borderRadius: 'var(--radius-pill)',
							background: 'var(--success)',
						}}
					/>
				)}
				<span style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 500, lineHeight: '20px' }}>{text}</span>
			</div>
			<span style={{ color: 'var(--success)', fontSize: 12, fontWeight: 500, lineHeight: '16px', textTransform: 'uppercase' }}>Correct answer</span>
		</div>
	);
}

function Swatch({ color }) {
	return (
		<div
			aria-hidden
			style={{ width: 15, height: 15, borderRadius: 'var(--radius-xs)', background: color }}
		/>
	);
}

function PartyIcon({ size, color }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
			<path
				d="M12 2L14.1 8.1L20.5 8.9L15.5 12.4L16.4 19L12 16.1L7.6 19L8.5 12.4L3.5 8.9L9.9 8.1L12 2Z"
				fill={color}
			/>
		</svg>
	);
}

function MiniCheckIcon() {
	return (
		<svg width="8" height="8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
			<path d="M20 6L9 17L4 12" stroke="var(--bg-surface)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

function FailXIcon({ size, color }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
			<circle cx="12" cy="12" r="10" fill={color} />
			<path d="M8 8L16 16M16 8L8 16" stroke="var(--bg-surface)" strokeWidth="2" strokeLinecap="round" />
		</svg>
	);
}

function CheckMarkIcon({ size, color }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
			<path d="M4 12L10 18L20 6" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
		</svg>
	);
}

function XMarkIcon({ size, color }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
			<path d="M6 6L18 18M18 6L6 18" stroke={color} strokeWidth="2" strokeLinecap="round" />
		</svg>
	);
}

function WarningSmallIcon({ color }) {
	return (
		<svg width={13} height={11} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
			<path d="M12 3L1 20h22L12 3z" fill={color} />
		</svg>
	);
}

function ArrowBackIcon({ size, color }) {
	return (
		<svg width={size} height={size} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
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

function RetakeIcon({ size, color }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
			<path
				d="M4.5 9.5A7.5 7.5 0 0 1 19 6M19 6l-3-3M19 6l-3 3M19.5 14.5A7.5 7.5 0 0 1 5 18M5 18l3 3M5 18l3-3"
				stroke={color}
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

function ChevronIcon({ down, size, color }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 12 12"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden
			style={{ transform: down ? 'none' : 'rotate(180deg)' }}
		>
			<path d="M2 4L6 8L10 4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

function SubmitModal({ answeredCount, totalQuestions, onBack, onConfirm, isSubmitting }) {
	return (
		<div
			role="dialog"
			aria-modal
			aria-labelledby="submit-quiz-title"
			onClick={onBack}
			style={{
				position: 'fixed',
				inset: 0,
				zIndex: 300,
				background: 'color-mix(in srgb, var(--text-primary) 30%, var(--bg-surface))',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				padding: 24,
			}}
		>
			<div
				role="presentation"
				onClick={(e) => e.stopPropagation()}
				className="card"
				style={{
					borderRadius: 'var(--radius-3xl)',
					maxWidth: 440,
					width: '100%',
					padding: 40,
					textAlign: 'center',
					boxShadow: 'var(--shadow-elevated)',
					border: '1px solid var(--border)',
				}}
			>
				<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
					<ModalWarningIcon />
					<div>
						<div id="submit-quiz-title" style={{ color: 'var(--text-primary)', fontSize: 24, fontWeight: 800, marginBottom: 12 }}>
							Submit Quiz?
						</div>
						<div style={{ color: 'var(--text-secondary)', fontSize: 16, lineHeight: 1.5 }}>
							You have answered{' '}
							<strong style={{ color: 'var(--text-primary)' }}>
								{answeredCount} of {totalQuestions}
							</strong>{' '}
							{totalQuestions === 1 ? 'question' : 'questions'}.
							<br />
							Once submitted, you cannot change your answers.
						</div>
					</div>
					<div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
						<button type="button" className="btn-secondary" onClick={onBack} style={{ minWidth: 120 }}>
							Go Back
						</button>
						<button
							type="button"
							className="btn-primary"
							onClick={onConfirm}
							disabled={isSubmitting}
							style={{ minWidth: 160 }}
						>
							{isSubmitting ? '…' : 'Confirm Submit'}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

function ModalWarningIcon() {
	return (
		<div
			style={{
				width: 72,
				height: 72,
				borderRadius: 'var(--radius-pill)',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				background: 'color-mix(in srgb, var(--accent) 12%, var(--bg-surface))',
			}}
		>
			<svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
				<path
					d="M12 3L1 20h22L12 3z"
					stroke="var(--accent)"
					strokeWidth="1.5"
					strokeLinejoin="round"
					fill="color-mix(in srgb, var(--accent) 8%, var(--bg-surface))"
				/>
				<path d="M12 9v4.5" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
				<circle cx="12" cy="17" r="0.9" fill="var(--accent)" />
			</svg>
		</div>
	);
}

function CheckIcon({ size = 20, color = 'var(--text-primary)' }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
			<path
				d="M20 6L9 17L4 12"
				stroke={color}
				strokeWidth="2.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

function InfoNoteIcon({ style }) {
	return (
		<svg viewBox="0 0 20 20" style={style} fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden>
			<path d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm1 5v4H9V5h2zm0 8H9v-2h2v2z" />
		</svg>
	);
}

function ArrowRightIcon({ size = 12, color = 'var(--bg-surface)' }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 12 12"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden
		>
			<path
				d="M2.5 6H9.5M9.5 6L6.5 3M9.5 6L6.5 9"
				stroke={color}
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

export default QuizPlayer;
