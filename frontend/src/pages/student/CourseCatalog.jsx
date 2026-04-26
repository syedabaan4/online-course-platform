import { useCallback, useEffect, useState } from 'react';
import CourseCard from '../../components/CourseCard';
import { getPublishedCourses } from '../../api/course.api';
import { showError } from '../../components/Toast';

const SEARCH_DEBOUNCE_MS = 350;

const CATALOG_CATEGORIES = [
	{ value: 'development', label: 'Development' },
	{ value: 'design', label: 'Design' },
	{ value: 'business', label: 'Business' },
	{ value: 'marketing', label: 'Marketing' },
	{ value: 'data science', label: 'Data science' },
];

const normalizeList = (payload) => {
	if (Array.isArray(payload?.data)) {
		return payload.data;
	}
	if (Array.isArray(payload)) {
		return payload;
	}
	return [];
};

const CourseCatalog = () => {
	const [courses, setCourses] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [searchInput, setSearchInput] = useState('');
	const [debouncedSearch, setDebouncedSearch] = useState('');
	const [category, setCategory] = useState('');
	const [difficulty, setDifficulty] = useState('');

	const fetchCourses = useCallback(async (params) => {
		setIsLoading(true);
		try {
			const response = await getPublishedCourses(params);
			setCourses(normalizeList(response));
		} catch (e) {
			setCourses([]);
			showError(String(e));
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		const t = setTimeout(() => {
			setDebouncedSearch(searchInput.trim());
		}, SEARCH_DEBOUNCE_MS);
		return () => clearTimeout(t);
	}, [searchInput]);

	useEffect(() => {
		fetchCourses({
			search: debouncedSearch,
			category: category,
			difficulty: difficulty,
		});
	}, [debouncedSearch, category, difficulty, fetchCourses]);

	const handleReset = () => {
		setSearchInput('');
		setDebouncedSearch('');
		setCategory('');
		setDifficulty('');
	};

	return (
		<main
			className="page-fade course-catalog"
			style={{
				width: '100%',
				maxWidth: 1280,
				margin: '0 auto',
				padding: '32px 24px 72px',
				color: 'var(--text-body)',
				fontFamily: 'var(--font)',
			}}
		>
			<header style={{ marginBottom: 28, display: 'flex', flexDirection: 'column', gap: 8 }}>
				<h1 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 32, fontWeight: 800, lineHeight: 1.2 }}>
					Course Catalog
				</h1>
				<p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 16, lineHeight: 1.5 }}>
					Browse published courses. Search by title, description, category, or instructor. Filters update as you
					type.
				</p>
			</header>

			<div
				className="course-catalog__filters"
				style={{
					padding: 20,
					marginBottom: 24,
					display: 'flex',
					flexWrap: 'wrap',
					gap: 12,
					alignItems: 'flex-end',
				}}
			>
				<div style={{ flex: '1 1 220px', minWidth: 0 }}>
					<label className="label" htmlFor="cat-search">
						Search
					</label>
					<input
						id="cat-search"
						type="search"
						className="input"
						placeholder="Title, topics in description, category, or instructor"
						value={searchInput}
						onChange={(e) => setSearchInput(e.target.value)}
						autoComplete="off"
					/>
				</div>
				<div style={{ width: 180 }}>
					<label className="label" htmlFor="cat-cat">
						Category
					</label>
					<select
						id="cat-cat"
						className="select"
						style={{ width: '100%' }}
						value={category}
						onChange={(e) => setCategory(e.target.value)}
					>
						<option value="">All categories</option>
						{CATALOG_CATEGORIES.map(({ value, label }) => (
							<option key={value} value={value}>
								{label}
							</option>
						))}
					</select>
				</div>
				<div style={{ width: 180 }}>
					<label className="label" htmlFor="cat-diff">
						Difficulty
					</label>
					<select
						id="cat-diff"
						className="select"
						style={{ width: '100%' }}
						value={difficulty}
						onChange={(e) => setDifficulty(e.target.value)}
					>
						<option value="">All levels</option>
						<option value="BEGINNER">Beginner</option>
						<option value="INTERMEDIATE">Intermediate</option>
						<option value="ADVANCED">Advanced</option>
					</select>
				</div>
				<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
					<button type="button" className="btn-secondary btn-sm" onClick={handleReset}>
						Reset filters
					</button>
				</div>
			</div>

			{isLoading ? (
				<div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
					<div className="spinner" />
				</div>
			) : courses.length === 0 ? (
				<div className="empty-state" style={{ minHeight: 220 }}>
					<p>No published courses match your filters.</p>
				</div>
			) : (
				<div className="course-catalog__grid">
					{courses.map((course) => (
						<CourseCard key={course.id} course={course} showProgress={false} />
					))}
				</div>
			)}
		</main>
	);
};

export default CourseCatalog;
