import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Login = () => {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const { login } = useAuth();

	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (event) => {
		event.preventDefault();
		setError('');

		const normalizedEmail = email.trim();
		if (!normalizedEmail || !password.trim()) {
			setError('Email and password are required.');
			return;
		}

		if (!normalizedEmail.includes('@')) {
			setError('Please enter a valid email address.');
			return;
		}

		setIsLoading(true);
		try {
			const user = await login(normalizedEmail, password);
			const returnTo = searchParams.get('returnTo');
			if (returnTo && returnTo.startsWith('/')) {
				navigate(returnTo);
				return;
			}
			if (user?.role === 'INSTRUCTOR') {
				navigate('/instructor');
			} else {
				navigate('/courses');
			}
		} catch (loginError) {
			setError(String(loginError));
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<main
			className="page-fade"
			style={{
				minHeight: 'calc(100vh - 64px)',
				width: '100%',
				background: 'var(--bg-primary)',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				padding: '24px',
			}}
		>
			<section
				className="card"
				style={{
					width: '100%',
					maxWidth: '420px',
					padding: '28px',
					borderRadius: '12px',
					display: 'flex',
					flexDirection: 'column',
					gap: '20px',
				}}
			>
				<header style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
					<div
						style={{
							fontFamily: 'var(--font)',
							fontWeight: 700,
							fontSize: '24px',
							lineHeight: '32px',
							color: 'var(--text-primary)',
						}}
					>
						Coursly
					</div>
					<h1
						style={{
							margin: 0,
							fontFamily: 'var(--font)',
							fontWeight: 700,
							fontSize: '20px',
							lineHeight: '28px',
							color: 'var(--text-primary)',
						}}
					>
						Sign in
					</h1>
				</header>

				<form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
					<div>
						<label className="label" htmlFor="email">
							Email
						</label>
						<input
							id="email"
							type="email"
							className="input"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							autoComplete="email"
							placeholder="you@example.com"
						/>
					</div>

					<div>
						<label className="label" htmlFor="password">
							Password
						</label>
						<input
							id="password"
							type="password"
							className="input"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							autoComplete="current-password"
							placeholder="Enter your password"
						/>
					</div>

					<div
						style={{
							minHeight: '20px',
							color: error ? 'var(--error)' : 'var(--text-muted)',
							fontFamily: 'var(--font)',
							fontSize: '14px',
							lineHeight: '20px',
						}}
						role={error ? 'alert' : undefined}
					>
						{error}
					</div>

					<button
						type="submit"
						className="btn-primary"
						disabled={isLoading}
						style={{
							width: '100%',
							justifyContent: 'center',
							opacity: isLoading ? 0.8 : 1,
							cursor: isLoading ? 'not-allowed' : 'pointer',
						}}
					>
						{isLoading ? (
							<div
								className="spinner"
								style={{
									width: '16px',
									height: '16px',
									borderWidth: '2px',
									margin: 0,
								}}
							/>
						) : (
							'Sign In'
						)}
					</button>
				</form>

				<p
					style={{
						margin: 0,
						fontFamily: 'var(--font)',
						fontSize: '14px',
						lineHeight: '20px',
						color: 'var(--text-secondary)',
					}}
				>
					Don&apos;t have an account?{' '}
					<Link to="/register" style={{ color: 'var(--accent)', fontWeight: 600 }}>
						Register
					</Link>
				</p>
			</section>
		</main>
	);
};

export default Login;
