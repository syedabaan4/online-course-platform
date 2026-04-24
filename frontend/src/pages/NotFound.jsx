import { Link } from 'react-router-dom';

const NotFound = () => {
	return (
		<div
			style={{
				minHeight: '100vh',
				width: '100%',
				background: 'var(--bg-primary)',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				padding: '24px',
				fontFamily: 'var(--font)',
			}}
		>
			<div
				style={{
					width: '100%',
					maxWidth: '720px',
					background: 'color-mix(in srgb, var(--bg-surface) 88%, transparent)',
					border: '1px solid var(--border)',
					borderRadius: '12px',
					backdropFilter: 'blur(6px)',
					boxShadow: 'var(--shadow-card)',
					padding: '56px 40px',
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					textAlign: 'center',
					gap: '12px',
				}}
			>
				<div
					style={{
						fontSize: '96px',
						lineHeight: '96px',
						fontWeight: 700,
						color: 'var(--text-primary)',
						letterSpacing: '-1px',
					}}
				>
					404
				</div>

				<h1
					style={{
						margin: 0,
						color: 'var(--text-primary)',
						fontSize: '32px',
						lineHeight: '40px',
						fontWeight: 700,
						fontFamily: 'var(--font)',
					}}
				>
					Page Not Found
				</h1>

				<p
					style={{
						margin: 0,
						color: 'var(--text-muted)',
						fontSize: '16px',
						lineHeight: '24px',
						maxWidth: '520px',
					}}
				>
					The page you are looking for does not exist or may have been moved.
				</p>

				<Link
					to="/"
					style={{
						marginTop: '12px',
						display: 'inline-flex',
						alignItems: 'center',
						justifyContent: 'center',
						padding: '12px 24px',
						borderRadius: '8px',
						background: 'var(--accent)',
						color: 'var(--bg-surface)',
						textDecoration: 'none',
						fontSize: '14px',
						lineHeight: '20px',
						fontWeight: 600,
						fontFamily: 'var(--font)',
						transition: 'background 0.15s ease',
					}}
				>
					Go Home
				</Link>
			</div>
		</div>
	);
};

export default NotFound;
