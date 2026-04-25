import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createCourse, getCourseById, updateCourse } from '../../api/course.api';
import LoadingSpinner from '../../components/LoadingSpinner';
import { showError, showSuccess } from '../../components/Toast';

const categories = ['Development', 'Design', 'Business', 'Marketing', 'Data Science'];
const difficulties = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

const emptyForm = {
	title: '',
	description: '',
	category: '',
	difficulty: '',
	thumbnailUrl: '',
};

const validateForm = (formState) => {
	const errors = {};

	if (!formState.title.trim()) {
		errors.title = 'Title is required.';
	}

	if (!formState.description.trim()) {
		errors.description = 'Description is required.';
	} else if (formState.description.trim().length < 20) {
		errors.description = 'Description must be at least 20 characters.';
	}

	if (!formState.category.trim()) {
		errors.category = 'Category is required.';
	}

	if (!formState.difficulty.trim()) {
		errors.difficulty = 'Difficulty is required.';
	}

	return errors;
};

const CourseForm = () => {
	const navigate = useNavigate();
	const { id } = useParams();
	const isEditMode = !!id;

	const [form, setForm] = useState(emptyForm);
	const [errors, setErrors] = useState({});
	const [isLoading, setIsLoading] = useState(isEditMode);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [formError, setFormError] = useState('');

	useEffect(() => {
		if (!isEditMode) {
			return;
		}

		let mounted = true;

		const loadCourse = async () => {
			setIsLoading(true);
			setFormError('');
			try {
				const response = await getCourseById(id);
				const course = response?.data || response;

				if (!mounted) {
					return;
				}

				setForm({
					title: course?.title || '',
					description: course?.description || '',
					category: course?.category || '',
					difficulty: course?.difficulty || '',
					thumbnailUrl: course?.thumbnailUrl || '',
				});
			} catch (error) {
				const message = String(error);
				if (mounted) {
					setFormError(message);
				}
				showError(message);
			} finally {
				if (mounted) {
					setIsLoading(false);
				}
			}
		};

		loadCourse();

		return () => {
			mounted = false;
		};
	}, [id, isEditMode]);

	const heading = useMemo(() => (isEditMode ? 'Edit Course' : 'Create New Course'), [isEditMode]);

	const updateField = (field, value) => {
		setForm((prev) => ({ ...prev, [field]: value }));
		setErrors((prev) => {
			if (!prev[field]) {
				return prev;
			}

			const next = { ...prev };
			delete next[field];
			return next;
		});
	};

	const handleSubmit = async (event) => {
		event.preventDefault();
		setFormError('');

		const validationErrors = validateForm(form);
		setErrors(validationErrors);

		if (Object.keys(validationErrors).length > 0) {
			return;
		}

		setIsSubmitting(true);
		try {
			const payload = {
				title: form.title.trim(),
				description: form.description.trim(),
				category: form.category,
				difficulty: form.difficulty,
				thumbnailUrl: form.thumbnailUrl.trim() || null,
			};

			if (isEditMode) {
				await updateCourse(id, payload);
				showSuccess('Course updated successfully.');
				navigate('/instructor');
			} else {
				const created = await createCourse(payload);
				const newId = created?.data?.id || created?.id;

				if (!newId) {
					throw new Error('Course created but no id returned from server.');
				}

				showSuccess('Course created! Now add your content.');
				navigate(`/instructor/courses/${newId}/build`);
			}
		} catch (error) {
			const message = String(error);
			setFormError(message);
			showError(message);
		} finally {
			setIsSubmitting(false);
		}
	};

	if (isLoading) {
		return (
			<main style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
				<LoadingSpinner />
			</main>
		);
	}

	return (
		<main
			className="page-fade"
			style={{
				width: '100%',
				minHeight: 'calc(100vh - 64px)',
				background: 'var(--bg-primary)',
				display: 'flex',
				justifyContent: 'center',
				padding: '32px',
			}}
		>
			<div style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
				<button
					type="button"
					onClick={() => navigate('/instructor')}
					style={{
						display: 'inline-flex',
						alignItems: 'center',
						gap: '8px',
						padding: 0,
						border: 'none',
						background: 'transparent',
						color: 'var(--text-primary)',
						fontFamily: 'var(--font)',
						fontSize: '14px',
						fontWeight: 500,
						lineHeight: '21px',
						cursor: 'pointer',
						width: 'fit-content',
					}}
				>
					<svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
						<path d="M6.25 2L3.25 5L6.25 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
					</svg>
					Back to Dashboard
				</button>

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
					{heading}
				</h1>

				<form className="card" onSubmit={handleSubmit} style={{ padding: '32px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
					<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
						<label className="label" htmlFor="title" style={{ fontSize: '16px', lineHeight: '24px' }}>
							Course Title <span style={{ color: 'var(--error)' }}>*</span>
						</label>
						<input
							id="title"
							type="text"
							className="input"
							value={form.title}
							onChange={(event) => updateField('title', event.target.value)}
							placeholder="e.g. Advanced React Patterns"
							style={{ fontSize: '16px', height: '48px' }}
						/>
						{errors.title ? (
							<div style={{ color: 'var(--error)', fontFamily: 'var(--font)', fontSize: '13px', lineHeight: '18px' }}>{errors.title}</div>
						) : null}
					</div>

					<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
						<label className="label" htmlFor="description" style={{ fontSize: '16px', lineHeight: '24px' }}>
							Course Description <span style={{ color: 'var(--error)' }}>*</span>
						</label>
						<textarea
							id="description"
							className="input"
							value={form.description}
							onChange={(event) => updateField('description', event.target.value)}
							placeholder="Briefly describe what students will learn..."
							style={{ fontSize: '16px', minHeight: '160px', resize: 'vertical' }}
						/>
						{errors.description ? (
							<div style={{ color: 'var(--error)', fontFamily: 'var(--font)', fontSize: '13px', lineHeight: '18px' }}>{errors.description}</div>
						) : null}
					</div>

					<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
						<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
							<label className="label" htmlFor="category" style={{ fontSize: '16px', lineHeight: '24px' }}>
								Category <span style={{ color: 'var(--error)' }}>*</span>
							</label>
							<select
								id="category"
								className="select"
								value={form.category}
								onChange={(event) => updateField('category', event.target.value)}
								style={{ height: '48px', fontSize: '16px' }}
							>
								<option value="">Select Category</option>
								{categories.map((item) => (
									<option key={item} value={item}>
										{item}
									</option>
								))}
							</select>
							{errors.category ? (
								<div style={{ color: 'var(--error)', fontFamily: 'var(--font)', fontSize: '13px', lineHeight: '18px' }}>{errors.category}</div>
							) : null}
						</div>

						<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
							<label className="label" htmlFor="difficulty" style={{ fontSize: '16px', lineHeight: '24px' }}>
								Difficulty <span style={{ color: 'var(--error)' }}>*</span>
							</label>
							<select
								id="difficulty"
								className="select"
								value={form.difficulty}
								onChange={(event) => updateField('difficulty', event.target.value)}
								style={{ height: '48px', fontSize: '16px' }}
							>
								<option value="">Select Level</option>
								{difficulties.map((item) => (
									<option key={item} value={item}>
										{item.charAt(0) + item.slice(1).toLowerCase()}
									</option>
								))}
							</select>
							{errors.difficulty ? (
								<div style={{ color: 'var(--error)', fontFamily: 'var(--font)', fontSize: '13px', lineHeight: '18px' }}>{errors.difficulty}</div>
							) : null}
						</div>
					</div>

					<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
						<label className="label" htmlFor="thumbnailUrl" style={{ fontSize: '16px', lineHeight: '24px' }}>
							Thumbnail URL
						</label>
						<input
							id="thumbnailUrl"
							type="text"
							className="input"
							value={form.thumbnailUrl}
							onChange={(event) => updateField('thumbnailUrl', event.target.value)}
							placeholder="https://example.com/course-cover.jpg"
							style={{ fontSize: '16px', height: '48px' }}
						/>
					</div>

					{formError ? (
						<div style={{ color: 'var(--error)', fontFamily: 'var(--font)', fontSize: '14px', lineHeight: '20px' }}>{formError}</div>
					) : null}

					<div style={{ paddingTop: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
						<button
							type="submit"
							className="btn-primary"
							disabled={isSubmitting}
							style={{ minWidth: '240px', justifyContent: 'center', opacity: isSubmitting ? 0.8 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
						>
							{isSubmitting ? <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', margin: 0 }} /> : 'Save & Continue'}
						</button>
						<button type="button" className="btn-secondary" onClick={() => navigate('/instructor')}>
							Cancel
						</button>
					</div>
				</form>
			</div>
		</main>
	);
};

export default CourseForm;
