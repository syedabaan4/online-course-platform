import { useCallback, useEffect, useState } from 'react';
import CourseCard from '../../components/CourseCard';
import { getPublishedCourses } from '../../api/course.api';
import { showError } from '../../components/Toast';

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
	const [search, setSearch] = useState('');
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
		fetchCourses({ search: '', category: '', difficulty: '' });
	}, [fetchCourses]);

	const handleApply = () => {
		fetchCourses({
			search: search.trim(),
			category: category.trim(),
			difficulty: difficulty.trim(),
		});
	};

	const handleReset = () => {
		setSearch('');
		setCategory('');
		setDifficulty('');
		fetchCourses({ search: '', category: '', difficulty: '' });
	};

	return (
		<main
			className="page-fade"
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
					Browse published courses. Search and filter to find what you need.
				</p>
			</header>

			<div
				className="card"
				style={{
					padding: 20,
					marginBottom: 24,
					display: 'flex',
					flexWrap: 'wrap',
					gap: 12,
					alignItems: 'flex-end',
				}}
			>
				<div style={{ flex: '1 1 200px', minWidth: 0 }}>
					<label className="label" htmlFor="cat-search">
						Search
					</label>
					<input
						id="cat-search"
						type="search"
						className="input"
						placeholder="Search by title"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
				</div>
				<div style={{ flex: '1 1 160px' }}>
					<label className="label" htmlFor="cat-cat">
						Category
					</label>
					<input
						id="cat-cat"
						type="text"
						className="input"
						placeholder="Exact match, e.g. Web Development"
						value={category}
						onChange={(e) => setCategory(e.target.value)}
					/>
				</div>
				<div style={{ width: 180 }}>
					<label className="label" htmlFor="cat-diff">
						Difficulty
					</label>
					<select
						id="cat-diff"
						className="select"
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
					<button type="button" className="btn-primary btn-sm" onClick={handleApply}>
						Apply
					</button>
					<button type="button" className="btn-secondary btn-sm" onClick={handleReset}>
						Reset
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
				<div
					style={{
						display: 'flex',
						flexWrap: 'wrap',
						gap: 24,
						justifyContent: 'flex-start',
					}}
				>
					{courses.map((course) => (
						<CourseCard key={course.id} course={course} showProgress={false} />
					))}
				</div>
			)}
		</main>
	);
};

export default CourseCatalog;
