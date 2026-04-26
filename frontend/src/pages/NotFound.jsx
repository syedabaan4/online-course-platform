import { Link } from 'react-router-dom';

const NotFound = () => {
	return (
		<main className="page-fade not-found-page">
			<div className="not-found-page__inner">
				<div className="card card-elevated-surface not-found-page__card">
					<div className="not-found-page__code" aria-hidden>
						404
					</div>
					<h1 className="not-found-page__title">Page not found</h1>
					<p className="not-found-page__lead">
						The page you are looking for does not exist or may have been moved.
					</p>
					<div className="not-found-page__actions">
						<Link to="/" className="btn-primary">
							Go home
						</Link>
						<Link to="/courses" className="btn-secondary">
							Browse courses
						</Link>
					</div>
				</div>
			</div>
		</main>
	);
};

export default NotFound;
