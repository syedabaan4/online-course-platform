import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Home = () => {
	const { user } = useAuth();

	return (
		<main
			className="page-fade home-page"
			style={{
				minHeight: 'calc(100vh - 64px)',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				background: 'var(--bg-primary)',
				color: 'var(--text-body)',
				fontFamily: 'var(--font)',
				boxSizing: 'border-box',
			}}
		>
			<div
				className="course-quiz-preview-wrap"
				style={{
					width: '100%',
					maxWidth: 520,
					margin: '0 auto',
					textAlign: 'center',
					boxSizing: 'border-box',
				}}
			>
				<p className="home-page-eyebrow">Online learning</p>
				<h1 className="home-page-title">
					<span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>Coursly</span>
					<span className="navbar-logo__period" aria-hidden="true">
						.
					</span>
				</h1>
				<p className="home-page-lead">Browse the catalog, study at your own pace, and earn certificates when you finish.</p>

				<div className="home-page-actions">
					<Link to="/courses" className="btn-primary">
						Browse courses
					</Link>
					{user ? (
						<Link to="/my-courses" className="btn-secondary">
							My learning
						</Link>
					) : (
						<Link to="/login" className="btn-secondary">
							Sign in
						</Link>
					)}
				</div>

				{!user ? (
					<p className="home-page-footnote">
						New here?{' '}
						<Link to="/register" className="home-page-footnote-link">
							Create an account
						</Link>
					</p>
				) : null}
			</div>
		</main>
	);
};

export default Home;
