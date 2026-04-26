import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
	createLecture,
	createModule,
	createResource,
	deleteLecture,
	deleteModule,
	deleteResource,
	getCourseById,
	publishCourse,
	updateLecture,
	updateModule,
} from '../../api/course.api';
import PublishCourseModal from '../../components/PublishCourseModal';
import { confirmAction, showError, showSuccess } from '../../components/Toast';
import './CourseBuilder.css';

const blankModuleForm = { title: '', description: '', order: 1 };
const blankLectureForm = { title: '', description: '', videoUrl: '', order: 1 };

const normalizeCourse = (payload) => payload?.data || payload;

const normalizeResources = (lecture) => {
	if (Array.isArray(lecture?.resources)) {
		return lecture.resources;
	}

	return [];
};

const formatFileSize = (fileSize) => {
	if (!Number.isFinite(fileSize) || fileSize <= 0) {
		return '';
	}

	if (fileSize < 1024) {
		return `${fileSize} B`;
	}

	if (fileSize < 1024 * 1024) {
		return `${(fileSize / 1024).toFixed(1)} KB`;
	}

	return `${(fileSize / (1024 * 1024)).toFixed(1)} MB`;
};

const getLectureMetaText = (lecture, resourceCount) => {
	if (lecture?.description?.trim()) {
		return lecture.description.trim();
	}

	if (resourceCount > 0) {
		return `${resourceCount} resource${resourceCount > 1 ? 's' : ''} attached`;
	}

	return 'Video lesson';
};

const CourseBuilder = () => {
	const { id: courseId } = useParams();
	const navigate = useNavigate();

	const [course, setCourse] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [pageError, setPageError] = useState('');

	const [editingModuleId, setEditingModuleId] = useState(null);
	const [editingModuleForm, setEditingModuleForm] = useState(blankModuleForm);

	const [lectureModalState, setLectureModalState] = useState({
		isOpen: false,
		mode: 'create',
		moduleId: null,
		moduleOrder: null,
		lectureId: null,
	});
	const [lectureModalForm, setLectureModalForm] = useState(blankLectureForm);
	const [lectureModalResources, setLectureModalResources] = useState([]);
	const [newLectureResource, setNewLectureResource] = useState({ title: '', file: null });
	const [isSavingLectureModal, setIsSavingLectureModal] = useState(false);
	const [lectureModalError, setLectureModalError] = useState('');
	const [draggedLecture, setDraggedLecture] = useState(null);
	const [isReorderingLectures, setIsReorderingLectures] = useState(false);

	const [newModule, setNewModule] = useState(blankModuleForm);
	const [isCreatingModule, setIsCreatingModule] = useState(false);

	const [expandedModuleById, setExpandedModuleById] = useState({});
	const [isAddModuleOpen, setIsAddModuleOpen] = useState(false);
	const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
	const [isPublishingCourse, setIsPublishingCourse] = useState(false);
	const [isBuilderPreviewOpen, setIsBuilderPreviewOpen] = useState(false);

	const fetchCourseData = useCallback(async () => {
		const response = await getCourseById(courseId);
		return normalizeCourse(response);
	}, [courseId]);

	const refreshCourse = useCallback(async () => {
		setIsLoading(true);

		try {
			const nextCourse = await fetchCourseData();
			setCourse(nextCourse);
			setPageError('');
		} catch (error) {
			const message = String(error);
			setPageError(message);
			showError(message);
			setCourse(null);
		} finally {
			setIsLoading(false);
		}
	}, [fetchCourseData]);

	useEffect(() => {
		let isMounted = true;

		const loadInitialCourse = async () => {
			try {
				const nextCourse = await fetchCourseData();
				if (!isMounted) {
					return;
				}
				setCourse(nextCourse);
				setPageError('');
			} catch (error) {
				if (!isMounted) {
					return;
				}
				const message = String(error);
				setPageError(message);
				showError(message);
				setCourse(null);
			} finally {
				if (isMounted) {
					setIsLoading(false);
				}
			}
		};

		loadInitialCourse();

		return () => {
			isMounted = false;
		};
	}, [fetchCourseData]);

	const modules = useMemo(() => course?.modules || [], [course]);
	const isDraft = String(course?.status || '').toUpperCase() !== 'PUBLISHED';
	const lectureTotal = useMemo(
		() => modules.reduce((sum, module) => sum + (module.lectures?.length || 0), 0),
		[modules]
	);
	const quizTotal = useMemo(
		() => modules.reduce((sum, module) => sum + (module.quiz?.isPublished ? 1 : 0), 0),
		[modules]
	);

	useEffect(() => {
		setExpandedModuleById((prev) => {
			const next = {};

			modules.forEach((module, index) => {
				next[module.id] = typeof prev[module.id] === 'boolean' ? prev[module.id] : index === 0;
			});

			return next;
		});
	}, [modules]);

	const beginEditModule = (module) => {
		setEditingModuleId(module.id);
		setEditingModuleForm({
			title: module.title || '',
			description: module.description || '',
			order: module.order || 1,
		});
	};

	const saveModuleEdit = async (moduleId) => {
		try {
			await updateModule(moduleId, {
				title: editingModuleForm.title.trim(),
				description: editingModuleForm.description.trim(),
				order: Number(editingModuleForm.order) || 1,
			});
			showSuccess('Module updated.');
			setEditingModuleId(null);
			await refreshCourse();
		} catch (error) {
			showError(String(error));
		}
	};

	const handleDeleteModule = async (moduleId) => {
		const confirmed = await confirmAction('Delete module?', 'All module lectures and resources will be removed.');
		if (!confirmed) {
			return;
		}

		try {
			await deleteModule(moduleId);
			showSuccess('Module deleted.');
			await refreshCourse();
		} catch (error) {
			showError(String(error));
		}
	};

	const handleDeleteLecture = async (lectureId) => {
		const confirmed = await confirmAction('Delete lecture?', 'This lecture and attached resources will be removed.');
		if (!confirmed) {
			return;
		}

		try {
			await deleteLecture(lectureId);
			showSuccess('Lecture deleted.');
			await refreshCourse();
		} catch (error) {
			showError(String(error));
		}
	};

	const submitNewModule = async (event) => {
		event.preventDefault();

		if (!newModule.title.trim()) {
			showError('Module title is required.');
			return;
		}

		setIsCreatingModule(true);
		try {
			await createModule({
				courseId: Number(courseId),
				title: newModule.title.trim(),
				description: newModule.description.trim(),
				order: Number(newModule.order) || modules.length + 1,
			});
			showSuccess('Module created.');
			setNewModule({ title: '', description: '', order: modules.length + 2 });
			setIsAddModuleOpen(false);
			await refreshCourse();
		} catch (error) {
			showError(String(error));
		} finally {
			setIsCreatingModule(false);
		}
	};

	const toggleModuleExpand = (moduleId) => {
		setExpandedModuleById((prev) => ({
			...prev,
			[moduleId]: !prev[moduleId],
		}));
	};

	const openCreateLectureModal = (module) => {
		setLectureModalState({
			isOpen: true,
			mode: 'create',
			moduleId: module.id,
			moduleOrder: module.order,
			lectureId: null,
		});
		setLectureModalForm({ title: '', description: '', videoUrl: '', order: (module.lectures?.length || 0) + 1 });
		setLectureModalResources([]);
		setNewLectureResource({ title: '', file: null });
		setLectureModalError('');
	};

	const openEditLectureModal = (module, lecture) => {
		setLectureModalState({
			isOpen: true,
			mode: 'edit',
			moduleId: module.id,
			moduleOrder: module.order,
			lectureId: lecture.id,
		});
		setLectureModalForm({
			title: lecture.title || '',
			description: lecture.description || '',
			videoUrl: lecture.videoUrl || '',
			order: lecture.order || 1,
		});
		setLectureModalResources(
			normalizeResources(lecture).map((resource) => ({
				id: resource.id,
				title: resource.title,
				fileUrl: resource.fileUrl,
				isNew: false,
			}))
		);
		setNewLectureResource({ title: '', file: null });
		setLectureModalError('');
	};

	const closeLectureModal = () => {
		if (isSavingLectureModal) {
			return;
		}

		setLectureModalState({ isOpen: false, mode: 'create', moduleId: null, moduleOrder: null, lectureId: null });
		setLectureModalForm(blankLectureForm);
		setLectureModalResources([]);
		setNewLectureResource({ title: '', file: null });
		setLectureModalError('');
	};

	const addResourceToLectureModal = () => {
		if (!newLectureResource.title.trim() || !newLectureResource.file) {
			setLectureModalError('Resource title and file are required before adding.');
			return;
		}

		setLectureModalResources((prev) => [
			...prev,
			{
				id: `new-${Date.now()}-${Math.random()}`,
				title: newLectureResource.title.trim(),
				file: newLectureResource.file,
				isNew: true,
			},
		]);
		setNewLectureResource({ title: '', file: null });
		setLectureModalError('');
	};

	const removeResourceFromLectureModal = async (resource) => {
		if (resource.isNew) {
			setLectureModalResources((prev) => prev.filter((item) => item.id !== resource.id));
			return;
		}

		try {
			await deleteResource(resource.id);
			setLectureModalResources((prev) => prev.filter((item) => item.id !== resource.id));
			showSuccess('Resource deleted.');
		} catch (error) {
			showError(String(error));
		}
	};

	const submitLectureModal = async (event) => {
		event.preventDefault();

		if (!lectureModalForm.title.trim() || !lectureModalForm.videoUrl.trim()) {
			showError('Lecture title and video URL are required.');
			return;
		}

		setIsSavingLectureModal(true);
		try {
			let lectureId = lectureModalState.lectureId;

			if (lectureModalState.mode === 'create') {
				const createdLectureResponse = await createLecture({
					moduleId: Number(lectureModalState.moduleId),
					title: lectureModalForm.title.trim(),
					description: lectureModalForm.description.trim(),
					videoUrl: lectureModalForm.videoUrl.trim(),
					order: Number(lectureModalForm.order) || 1,
				});
				const createdLecture = createdLectureResponse?.data || createdLectureResponse;
				lectureId = createdLecture?.id;
			} else {
				await updateLecture(lectureModalState.lectureId, {
					title: lectureModalForm.title.trim(),
					description: lectureModalForm.description.trim(),
					videoUrl: lectureModalForm.videoUrl.trim(),
					order: Number(lectureModalForm.order) || 1,
				});
			}

			if (!lectureId) {
				throw new Error('Unable to resolve lecture id for resource uploads.');
			}

			const newResources = lectureModalResources.filter((resource) => resource.isNew);

			if (newResources.length > 0) {
				await Promise.all(
					newResources.map((resource) => {
						const formData = new FormData();
						formData.append('lectureId', String(lectureId));
						formData.append('title', resource.title);
						formData.append('file', resource.file);

						return createResource(formData);
					})
				);
			}

			showSuccess(lectureModalState.mode === 'create' ? 'Lecture added.' : 'Lecture updated.');
			closeLectureModal();
			await refreshCourse();
		} catch (error) {
			const message = String(error);
			setLectureModalError(message);
			showError(message);
		} finally {
			setIsSavingLectureModal(false);
		}
	};

	const handleDragStartLecture = (moduleId, lectureId) => {
		setDraggedLecture({ moduleId, lectureId });
	};

	const handleDropLecture = async (module, targetLectureId) => {
		if (!draggedLecture || draggedLecture.moduleId !== module.id) {
			return;
		}

		const sortedLectures = [...(module.lectures || [])].sort((a, b) => a.order - b.order);
		const sourceIndex = sortedLectures.findIndex((lecture) => lecture.id === draggedLecture.lectureId);
		const targetIndex = sortedLectures.findIndex((lecture) => lecture.id === targetLectureId);

		if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
			setDraggedLecture(null);
			return;
		}

		const reordered = [...sortedLectures];
		const [moved] = reordered.splice(sourceIndex, 1);
		reordered.splice(targetIndex, 0, moved);

		const updates = reordered
			.map((lecture, index) => ({
				lecture,
				order: index + 1,
			}))
			.filter(({ lecture, order }) => lecture.order !== order);

		if (updates.length === 0) {
			setDraggedLecture(null);
			return;
		}

		setIsReorderingLectures(true);
		try {
			await Promise.all(
				updates.map(({ lecture, order }) =>
					updateLecture(lecture.id, {
						title: lecture.title,
						description: lecture.description,
						videoUrl: lecture.videoUrl,
						order,
					})
				)
			);

			showSuccess('Lecture order updated.');
			await refreshCourse();
		} catch (error) {
			showError(String(error));
		} finally {
			setDraggedLecture(null);
			setIsReorderingLectures(false);
		}
	};

	const openPublishModal = () => {
		setIsPublishModalOpen(true);
	};

	const closePublishModal = () => {
		if (isPublishingCourse) {
			return;
		}
		setIsPublishModalOpen(false);
	};

	const handlePublishNow = async () => {
		setIsPublishingCourse(true);
		try {
			await publishCourse(course.id);
			showSuccess('Course published successfully.');
			setIsPublishModalOpen(false);
			await refreshCourse();
		} catch (error) {
			showError(String(error));
		} finally {
			setIsPublishingCourse(false);
		}
	};

	if (isLoading) {
		return (
			<main className="course-builder-page">
				<div className="course-builder-shell">
					<div className="course-builder-loading" role="status" aria-live="polite">
						<div className="spinner" />
					</div>
				</div>
			</main>
		);
	}

	if (!course) {
		return (
			<main className="course-builder-page">
				<div className="course-builder-shell">
					<section className="empty-state" style={{ minHeight: 'calc(100vh - 160px)' }}>
						<p>{pageError || 'Unable to load course.'}</p>
						<p className="builder-error-text">{pageError || 'Please refresh and try again.'}</p>
					</section>
				</div>
			</main>
		);
	}

	return (
		<main className="course-builder-page page-fade">
			<div className="course-builder-shell">
				<header className="builder-header-row">
					<div className="builder-title-area">
						<div className="builder-breadcrumbs">
							<Link to="/instructor" className="builder-breadcrumb-link">
								My Courses
							</Link>
							<span>/</span>
							<span className="builder-breadcrumb-current">{course.title}</span>
						</div>
						<div className="builder-page-title-wrap">
							<h1 className="builder-page-title">Course Content Builder</h1>
							<span className={`badge ${isDraft ? 'badge-draft' : 'badge-published'}`}>{isDraft ? 'Draft' : 'Published'}</span>
						</div>
					</div>

					<div className="builder-top-actions">
						<button type="button" className="btn-secondary btn-sm" onClick={() => setIsBuilderPreviewOpen(true)}>
							Preview
						</button>
						<button
							type="button"
							className="btn-secondary btn-sm"
							onClick={() => navigate(`/instructor/courses/${courseId}/edit`)}
						>
							Settings
						</button>
					</div>
				</header>

				<section className="builder-modules-stack">
					{modules.map((module) => {
						const lectureCount = module.lectures?.length || 0;
						const resourcesCount = (module.lectures || []).reduce((sum, lecture) => sum + normalizeResources(lecture).length, 0);
						const hasQuiz = Boolean(module.quiz);
						const quizPublished = Boolean(module.quiz?.isPublished);
						const isExpanded = Boolean(expandedModuleById[module.id]);
						const isEditingModule = editingModuleId === module.id;

						return (
							<article key={module.id} className={`card builder-module-card ${isExpanded ? 'is-expanded' : ''}`}>
								<header className="builder-module-header">
									<div className="builder-module-heading-wrap">
										<button
											type="button"
											className={`builder-chevron-button ${isExpanded ? 'open' : ''}`}
											onClick={() => toggleModuleExpand(module.id)}
											aria-label={isExpanded ? 'Collapse module' : 'Expand module'}
										>
											<svg width="12" height="8" viewBox="0 0 12 8" fill="none" aria-hidden="true">
												<path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
											</svg>
										</button>
										<div className="builder-module-heading-text">
											<div className="builder-module-title">Module {module.order}: {module.title}</div>
											<div className="builder-module-description">{module.description || 'No description provided.'}</div>
										</div>
									</div>

									<div className="builder-module-right">
										<div className="builder-module-stats">
											<div className="builder-module-stat-item">
												<svg className="builder-module-stat-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
													<rect x="2" y="2.5" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.25" />
													<path d="M5 5.5H11M5 8H11M5 10.5H8.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
												</svg>
												<span>{lectureCount} Lectures</span>
											</div>
											<div className="builder-module-stat-item">
												<svg className="builder-module-stat-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
													<path d="M8 2L13 4.2V8.2C13 11 10.8 13.4 8 14C5.2 13.4 3 11 3 8.2V4.2L8 2Z" stroke="currentColor" strokeWidth="1.25" />
													<path d="M6.2 7.8L7.3 8.9L9.9 6.3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
												</svg>
												<span>
													{hasQuiz
														? quizPublished
															? '1 Quiz'
															: '1 Quiz (draft)'
														: '0 Quiz'}
												</span>
											</div>
											<div className="builder-module-stat-item">
												<svg className="builder-module-stat-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
													<path d="M3 5.5V12C3 12.6 3.4 13 4 13H12C12.6 13 13 12.6 13 12V5.5" stroke="currentColor" strokeWidth="1.25" />
													<path d="M2 4C2 3.4 2.4 3 3 3H13C13.6 3 14 3.4 14 4V5C14 5.6 13.6 6 13 6H3C2.4 6 2 5.6 2 5V4Z" stroke="currentColor" strokeWidth="1.25" />
													<path d="M6 8H10" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
												</svg>
												<span>{resourcesCount} Resources</span>
											</div>
										</div>

										<div className="builder-module-actions">
											<button type="button" className="btn-secondary btn-sm" onClick={() => (isEditingModule ? setEditingModuleId(null) : beginEditModule(module))}>
												{isEditingModule ? 'Cancel Edit' : 'Edit'}
											</button>
											<button type="button" className="btn-danger btn-sm" onClick={() => handleDeleteModule(module.id)}>
												Delete
											</button>
										</div>

										<button
											type="button"
											className={`builder-chevron-button ${isExpanded ? 'open' : ''}`}
											onClick={() => toggleModuleExpand(module.id)}
											aria-label={isExpanded ? 'Collapse module' : 'Expand module'}
										>
											<svg width="12" height="8" viewBox="0 0 12 8" fill="none" aria-hidden="true">
												<path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
											</svg>
										</button>
									</div>
								</header>

								{isExpanded ? (
									<div className="builder-module-body">
										{isEditingModule ? (
											<div className="card builder-inline-editor">
												<label className="label" htmlFor={`module-title-${module.id}`}>Module Title</label>
												<input
													id={`module-title-${module.id}`}
													className="input"
													value={editingModuleForm.title}
													onChange={(event) => setEditingModuleForm((prev) => ({ ...prev, title: event.target.value }))}
												/>
												<label className="label" htmlFor={`module-description-${module.id}`}>Description</label>
												<textarea
													id={`module-description-${module.id}`}
													className="input"
													value={editingModuleForm.description}
													onChange={(event) => setEditingModuleForm((prev) => ({ ...prev, description: event.target.value }))}
													style={{ minHeight: '90px', resize: 'vertical' }}
												/>
												<label className="label" htmlFor={`module-order-${module.id}`}>Order</label>
												<input
													id={`module-order-${module.id}`}
													type="number"
													className="input"
													value={editingModuleForm.order}
													onChange={(event) => setEditingModuleForm((prev) => ({ ...prev, order: event.target.value }))}
													min="1"
												/>
												<div className="builder-inline-editor-actions">
													<button type="button" className="btn-primary btn-sm" onClick={() => saveModuleEdit(module.id)}>
														Save Module
													</button>
												</div>
											</div>
										) : null}

										<div className="builder-lecture-list">
											{(module.lectures || []).map((lecture) => {
												const resources = normalizeResources(lecture);

												return (
													<div key={lecture.id} className="builder-lecture-item">
														<div
															className={`builder-lecture-row ${draggedLecture?.lectureId === lecture.id ? 'is-dragging' : ''}`}
															onDragOver={(event) => event.preventDefault()}
															onDrop={() => handleDropLecture(module, lecture.id)}
														>
															<div className="builder-lecture-main">
																<div
																	className="builder-lecture-grip"
																	draggable={!isReorderingLectures}
																	onDragStart={() => handleDragStartLecture(module.id, lecture.id)}
																	onDragEnd={() => setDraggedLecture(null)}
																	aria-label="Drag to reorder lecture"
																	title="Drag to reorder"
																>
																	=
																</div>
																<div className="builder-lecture-icon" aria-hidden="true">
																	<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
																		<path d="M5 4L10 7L5 10V4Z" fill="currentColor" />
																	</svg>
																</div>
																<div className="builder-lecture-text">
																	<div className="builder-lecture-title">Lecture {module.order}.{lecture.order}: {lecture.title}</div>
																	<div className="builder-lecture-meta">{getLectureMetaText(lecture, resources.length)}</div>
																</div>
															</div>

															<div className="builder-lecture-actions">
																<button
																	type="button"
																	className="btn-secondary btn-sm"
																	onClick={() => openEditLectureModal(module, lecture)}
																>
																	Edit
																</button>
																<button type="button" className="btn-danger btn-sm" onClick={() => handleDeleteLecture(lecture.id)}>
																	Delete
																</button>
															</div>
														</div>
													</div>
												);
											})}
										</div>

										<div className="builder-module-bottom-actions">
											<button type="button" className="btn-secondary builder-neutral-cta" onClick={() => openCreateLectureModal(module)}>
												Add Lecture
											</button>
											<button
												type="button"
												className="btn-secondary builder-neutral-cta"
												onClick={() => navigate(`/instructor/courses/${courseId}/quiz/${module.id}`)}
											>
												{hasQuiz ? 'Edit Quiz' : 'Add Quiz'}
											</button>
										</div>
									</div>
								) : null}
							</article>
						);
					})}

					<div className="builder-add-module-area">
						<button
							type="button"
							className="builder-add-module-cta"
							onClick={() => setIsAddModuleOpen((prev) => !prev)}
						>
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
								<path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
							</svg>
							<span>{isAddModuleOpen ? 'Hide Module Form' : 'Add New Module'}</span>
						</button>

						{isAddModuleOpen ? (
							<form className="card builder-add-module-form" onSubmit={submitNewModule}>
								<div className="builder-form-title">Add New Module</div>
								<label className="label" htmlFor="new-module-title">Title</label>
								<input
									id="new-module-title"
									className="input"
									value={newModule.title}
									onChange={(event) => setNewModule((prev) => ({ ...prev, title: event.target.value }))}
								/>
								<label className="label" htmlFor="new-module-description">Description</label>
								<textarea
									id="new-module-description"
									className="input"
									value={newModule.description}
									onChange={(event) => setNewModule((prev) => ({ ...prev, description: event.target.value }))}
									style={{ minHeight: '90px', resize: 'vertical' }}
								/>
								<label className="label" htmlFor="new-module-order">Order</label>
								<input
									id="new-module-order"
									className="input"
									type="number"
									min="1"
									value={newModule.order}
									onChange={(event) => setNewModule((prev) => ({ ...prev, order: event.target.value }))}
								/>
								<div className="builder-inline-editor-actions">
									<button type="submit" className="btn-primary" disabled={isCreatingModule}>
										{isCreatingModule ? 'Adding...' : 'Add Module'}
									</button>
								</div>
							</form>
						) : null}
					</div>
				</section>

				<footer className="builder-footer-row">
					<button type="button" className="btn-secondary btn-sm" onClick={() => navigate('/instructor')}>
						Back
					</button>
					<div className="builder-footer-actions">
						<button type="button" className="btn-secondary" onClick={() => showSuccess('Draft saved locally.')}>Save as Draft</button>
						<button type="button" className="btn-primary" onClick={openPublishModal}>Publish Course 🚀</button>
					</div>
				</footer>

				{pageError ? <div className="builder-error-text">{pageError}</div> : null}
			</div>

			{lectureModalState.isOpen ? (
				<div
					className="builder-modal-overlay"
					style={{
						position: 'fixed',
						inset: 0,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						zIndex: 120,
						padding: '24px',
					}}
					onClick={closeLectureModal}
				>
					<div
						className="card builder-lecture-modal-card"
						style={{ width: '100%', maxWidth: '720px', padding: 0, overflow: 'hidden' }}
						onClick={(event) => event.stopPropagation()}
					>
						<div style={{ padding: '24px', borderBottom: '1px solid var(--border-light)', display: 'inline-flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
							<div style={{ color: 'var(--text-primary)', fontFamily: 'var(--font)', fontSize: '20px', lineHeight: '28px', fontWeight: 700 }}>
								{lectureModalState.mode === 'edit' ? 'Edit Lecture in Module' : 'Add Lecture to Module'} {lectureModalState.moduleOrder || ''}
							</div>
							<button type="button" className="builder-close-icon" onClick={closeLectureModal} disabled={isSavingLectureModal} aria-label="Close lecture modal">
								<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
									<path d="M3 3L13 13M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
								</svg>
							</button>
						</div>

						<form onSubmit={submitLectureModal} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
							<div>
								<label className="label" htmlFor="new-lecture-title">Lecture Title *</label>
								<input
									id="new-lecture-title"
									className="input"
									value={lectureModalForm.title}
									onChange={(event) => {
										setLectureModalForm((prev) => ({ ...prev, title: event.target.value }));
										setLectureModalError('');
									}}
									placeholder="e.g., Introduction to React Hooks"
								/>
							</div>

							<div>
								<label className="label" htmlFor="new-lecture-description">Description</label>
								<textarea
									id="new-lecture-description"
									className="input"
									value={lectureModalForm.description}
									onChange={(event) => {
										setLectureModalForm((prev) => ({ ...prev, description: event.target.value }));
										setLectureModalError('');
									}}
									style={{ minHeight: '120px', resize: 'vertical' }}
									placeholder="Enter a brief summary of what students will learn in this lecture..."
								/>
							</div>

							<div>
								<label className="label" htmlFor="new-lecture-video">Video URL *</label>
								<input
									id="new-lecture-video"
									className="input"
									value={lectureModalForm.videoUrl}
									onChange={(event) => {
										setLectureModalForm((prev) => ({ ...prev, videoUrl: event.target.value }));
										setLectureModalError('');
									}}
									placeholder="https://vimeo.com/..."
								/>
							</div>

							<div style={{ display: 'none' }}>
								<input
									id="new-lecture-order"
									type="number"
									min="1"
									className="input"
									value={lectureModalForm.order}
									onChange={(event) => setLectureModalForm((prev) => ({ ...prev, order: event.target.value }))}
								/>
							</div>

							<div className="builder-modal-resource-block">
								<div className="label">Attach Resources</div>
								{lectureModalResources.length > 0 ? (
									<div className="builder-modal-resource-list">
										{lectureModalResources.map((resource) => (
											<div key={resource.id} className="builder-modal-resource-item">
												<div className="builder-modal-resource-main">
													<div className="builder-modal-resource-icon">
														<svg width="14" height="16" viewBox="0 0 14 16" fill="none" aria-hidden="true">
															<path d="M3 1.5H8.5L12 5V14C12 14.6 11.6 15 11 15H3C2.4 15 2 14.6 2 14V2.5C2 1.9 2.4 1.5 3 1.5Z" stroke="currentColor" strokeWidth="1.25" />
															<path d="M8.5 1.5V5H12" stroke="currentColor" strokeWidth="1.25" />
														</svg>
													</div>
													<div className="builder-modal-resource-text">
														<div>{resource.title}</div>
														{resource.isNew ? <span>{formatFileSize(resource.file?.size)}</span> : <span>Uploaded</span>}
													</div>
												</div>
												<button
													type="button"
													className="builder-resource-delete-icon"
													onClick={() => removeResourceFromLectureModal(resource)}
													aria-label="Remove resource"
												>
													<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
														<path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
													</svg>
												</button>
											</div>
										))}
									</div>
								) : (
									<div className="builder-modal-resource-empty">No resources attached yet.</div>
								)}

								<div className="builder-modal-add-resource-row">
									<input
										className="input"
										placeholder="Resource title"
										value={newLectureResource.title}
										onChange={(event) => setNewLectureResource((prev) => ({ ...prev, title: event.target.value }))}
									/>
									<input
										className="input"
										type="file"
										accept=".pdf,.pptx,.docx,.zip,.js,.py,.txt"
										onChange={(event) => setNewLectureResource((prev) => ({ ...prev, file: event.target.files?.[0] || null }))}
									/>
									<button type="button" className="btn-secondary btn-sm" onClick={addResourceToLectureModal}>
										+ Add Resource
									</button>
								</div>
							</div>

							{lectureModalError ? <div className="builder-error-text">{lectureModalError}</div> : null}

							<div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
								<button type="button" className="btn-secondary" onClick={closeLectureModal} disabled={isSavingLectureModal}>
									Cancel
								</button>
								<button type="submit" className="btn-primary" disabled={isSavingLectureModal}>
									{isSavingLectureModal ? 'Saving...' : 'Save Lecture'}
								</button>
							</div>
						</form>
					</div>
				</div>
			) : null}

			{isBuilderPreviewOpen && course ? (
				<div
					className="builder-content-preview-overlay"
					onClick={() => setIsBuilderPreviewOpen(false)}
					role="presentation"
				>
					<div
						className="card builder-content-preview-card"
						role="dialog"
						aria-modal="true"
						aria-labelledby="builder-preview-title"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="builder-content-preview-header">
							<div>
								<p className="builder-content-preview-eyebrow" id="builder-preview-title">
									Course preview
								</p>
							</div>
							<button
								type="button"
								className="builder-close-icon"
								onClick={() => setIsBuilderPreviewOpen(false)}
								aria-label="Close preview"
							>
								<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
									<path d="M3 3L13 13M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
								</svg>
							</button>
						</div>
						<div className="builder-content-preview-body">
							<h3 className="builder-content-preview-cname">{course.title || 'Untitled course'}</h3>
							<p className="builder-content-preview-desc">{course.description || 'No description yet.'}</p>
							<div className="builder-content-preview-meta">
								{course.category ? (
									<span className="badge badge-gray">{String(course.category).replace(/_/g, ' ')}</span>
								) : null}
								{course.difficulty ? (
									<span className="badge badge-gray">{String(course.difficulty).replace(/_/g, ' ')}</span>
								) : null}
								{isDraft ? <span className="badge badge-draft">Draft</span> : <span className="badge badge-published">Published</span>}
							</div>
							{course.instructor?.name ? (
								<p className="builder-content-preview-instructor">Instructor: {course.instructor.name}</p>
							) : null}
							<div className="builder-content-preview-modules">
								<p className="label" style={{ marginTop: 8 }}>
									Content outline
								</p>
								{modules.length === 0 ? (
									<p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>No modules yet. Add a module to build your course.</p>
								) : (
									<ol className="builder-content-preview-ol">
										{modules.map((m) => {
											const n = m.lectures?.length || 0;
											return (
												<li key={m.id}>
													<span className="builder-content-preview-mtitle">
														Module {m.order}: {m.title}
													</span>
													<span className="builder-content-preview-lecture-count">
														{n} lecture{n === 1 ? '' : 's'}
													</span>
												</li>
											);
										})}
									</ol>
								)}
							</div>
						</div>
						<div className="builder-content-preview-footer">
							<button type="button" className="btn-primary" onClick={() => setIsBuilderPreviewOpen(false)}>
								Close
							</button>
						</div>
					</div>
				</div>
			) : null}

			{isPublishModalOpen && course ? (
				<PublishCourseModal
					isOpen
					onClose={closePublishModal}
					onPublish={handlePublishNow}
					courseTitle={course.title}
					moduleCount={modules.length}
					lectureCount={lectureTotal}
					quizCount={quizTotal}
					isPublishing={isPublishingCourse}
					isLoading={false}
				/>
			) : null}
		</main>
	);
};

export default CourseBuilder;
