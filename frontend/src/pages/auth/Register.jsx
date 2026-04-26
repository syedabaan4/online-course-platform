import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { showSuccess } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';

const Register = () => {
	const navigate = useNavigate();
	const { register } = useAuth();

	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [role, setRole] = useState('STUDENT');
	const [error, setError] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (event) => {
		event.preventDefault();
		setError('');

		const normalizedName = name.trim();
		const normalizedEmail = email.trim();
		const normalizedPassword = password.trim();

		if (!normalizedName || !normalizedEmail || !normalizedPassword || !role) {
			setError('All fields are required.');
			return;
		}

		if (!normalizedEmail.includes('@')) {
			setError('Please enter a valid email address.');
			return;
		}

		if (normalizedPassword.length < 6) {
			setError('Password must be at least 6 characters long.');
			return;
		}

		setIsLoading(true);
		try {
			await register(normalizedName, normalizedEmail, normalizedPassword, role);
			showSuccess('Account created! Please log in.');
			navigate('/login');
		} catch (registerError) {
			setError(String(registerError));
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
					borderRadius: 'var(--radius-lg)',
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
						Create account
					</h1>
				</header>

				<form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
					<div>
						<label className="label" htmlFor="name">
							Full Name
						</label>
						<input
							id="name"
							type="text"
							className="input"
							value={name}
							onChange={(event) => setName(event.target.value)}
							autoComplete="name"
							placeholder="Enter your full name"
						/>
					</div>

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
							autoComplete="new-password"
							placeholder="Minimum 6 characters"
						/>
					</div>

					<div>
						<label className="label" htmlFor="role">
							Role
						</label>
						<select
							id="role"
							className="select"
							value={role}
							onChange={(event) => setRole(event.target.value)}
						>
							<option value="STUDENT">Student</option>
							<option value="INSTRUCTOR">Instructor</option>
						</select>
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
							'Create Account'
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
					Already have an account?{' '}
					<Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>
						Login
					</Link>
				</p>
			</section>
		</main>
	);
};

export default Register;
