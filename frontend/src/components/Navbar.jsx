import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const { user, isLoading, isAuthenticated, isInstructor, logout } = useAuth();
	const [actionError, setActionError] = useState('');

	const navLinks = useMemo(() => {
		if (!isAuthenticated) {
			return [{ label: 'Browse Courses', to: '/courses' }];
		}

		if (isInstructor) {
			return [
				{ label: 'Dashboard', to: '/instructor' },
				{ label: 'Browse Courses', to: '/courses' },
			];
		}

		return [
			{ label: 'Browse Courses', to: '/courses' },
			{ label: 'My Learning', to: '/my-courses' },
			{ label: 'Certificates', to: '/certificates' },
		];
	}, [isAuthenticated, isInstructor]);

	const handleLogout = async () => {
		setActionError('');
		try {
			await logout();
			navigate('/login');
		} catch (error) {
			setActionError(String(error));
		}
	};

	const displayName = user?.name || 'User';
	const roleLabel = isInstructor ? 'Instructor' : 'Student';
	const initials = displayName
		.split(' ')
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase())
		.join('');

	return (
		<div
			style={{
				width: '100%',
				background: 'color-mix(in srgb, var(--bg-surface) 80%, transparent)',
				borderBottom: '1px solid var(--border)',
				backdropFilter: 'blur(6px)',
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'flex-start',
				alignItems: 'center',
				position: 'sticky',
				top: 0,
				zIndex: 100,
			}}
		>
			<div
				style={{
					width: '100%',
					maxWidth: '1440px',
					height: '64px',
					paddingLeft: '48px',
					paddingRight: '48px',
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
				}}
			>
				{isLoading ? (
					<div
						style={{
							width: '100%',
							display: 'flex',
							justifyContent: 'center',
							alignItems: 'center',
						}}
					>
						<div className="spinner" />
					</div>
				) : (
					<>
						<div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '32px' }}>
							<Link to="/" style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '8px' }}>
								<div
									style={{
										width: '36px',
										height: '36px',
										background: 'var(--accent-bg)',
										borderRadius: '8px',
										display: 'flex',
										justifyContent: 'center',
										alignItems: 'center',
										color: 'var(--accent)',
										fontFamily: 'var(--font)',
										fontWeight: 700,
										fontSize: '16px',
										lineHeight: '20px',
									}}
								>
									C
								</div>
								<div style={{ display: 'inline-flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start' }}>
									<div
										style={{
											width: '76px',
											height: '28px',
											display: 'flex',
											flexDirection: 'column',
											justifyContent: 'center',
											color: 'var(--text-primary)',
											fontSize: '20px',
											fontFamily: 'var(--font)',
											fontWeight: 700,
											lineHeight: '28px',
										}}
									>
										Coursly
									</div>
								</div>
							</Link>

							<div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '24px' }}>
								{navLinks.map((link) => {
									const isActive = location.pathname === link.to;

									return (
										<Link
											key={link.to}
											to={link.to}
											style={{
												paddingLeft: '12px',
												paddingRight: '12px',
												paddingTop: '8px',
												paddingBottom: '8px',
												borderRadius: '8px',
												display: 'inline-flex',
												flexDirection: 'column',
												justifyContent: 'flex-start',
												alignItems: 'flex-start',
												background: isActive ? 'var(--accent-bg)' : 'transparent',
											}}
										>
											<span
												style={{
													height: '20px',
													display: 'flex',
													flexDirection: 'column',
													justifyContent: 'center',
													textAlign: 'center',
													color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
													fontSize: '14px',
													fontFamily: 'var(--font)',
													fontWeight: 500,
													lineHeight: '20px',
													whiteSpace: 'nowrap',
												}}
											>
												{link.label}
											</span>
										</Link>
									);
								})}
							</div>
						</div>

						<div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '16px' }}>
							{isAuthenticated ? (
								<>
									<div
										style={{
											padding: '8px',
											position: 'relative',
											display: 'inline-flex',
											justifyContent: 'center',
											alignItems: 'center',
											color: 'var(--text-muted)',
										}}
										aria-label="notifications"
									>
										<svg width="16" height="20" viewBox="0 0 16 20" fill="none" aria-hidden="true">
											<path
												d="M8 1.5C5.23858 1.5 3 3.73858 3 6.5V9.24872C3 10.1165 2.7155 10.9604 2.18973 11.651L0.98058 13.2394C0.399574 14.0026 0.943844 15.1 1.90267 15.1H14.0973C15.0562 15.1 15.6004 14.0026 15.0194 13.2394L13.8103 11.651C13.2845 10.9604 13 10.1165 13 9.24872V6.5C13 3.73858 10.7614 1.5 8 1.5Z"
												fill="currentColor"
											/>
											<path d="M6 17.1C6 18.2046 6.89543 19.1 8 19.1C9.10457 19.1 10 18.2046 10 17.1" fill="currentColor" />
										</svg>
										<div
											style={{
												width: '8px',
												height: '8px',
												position: 'absolute',
												left: '16px',
												top: '8px',
												background: 'var(--error)',
												borderRadius: '9999px',
												border: '2px solid var(--bg-surface)',
											}}
										/>
									</div>

									<div
										style={{
											width: '1px',
											height: '32px',
											background: 'var(--border)',
										}}
									/>

									<div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '12px' }}>
										<div style={{ display: 'inline-flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start', gap: '4px' }}>
											<div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-end' }}>
												<div
													style={{
														textAlign: 'right',
														display: 'flex',
														flexDirection: 'column',
														justifyContent: 'center',
														color: 'var(--text-primary)',
														fontSize: '14px',
														fontFamily: 'var(--font)',
														fontWeight: 600,
														lineHeight: '14px',
													}}
												>
													{displayName}
												</div>
											</div>
											<div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-end' }}>
												<div
													style={{
														textAlign: 'right',
														display: 'flex',
														flexDirection: 'column',
														justifyContent: 'center',
														color: 'var(--text-muted)',
														fontSize: '12px',
														fontFamily: 'var(--font)',
														fontWeight: 400,
														lineHeight: '16px',
													}}
												>
													{roleLabel}
												</div>
											</div>
										</div>
										<div
											style={{
												width: '40px',
												height: '40px',
												background: 'var(--border)',
												overflow: 'hidden',
												borderRadius: '9999px',
												display: 'inline-flex',
												justifyContent: 'center',
												alignItems: 'center',
												color: 'var(--text-secondary)',
												fontFamily: 'var(--font)',
												fontSize: '14px',
												fontWeight: 600,
												lineHeight: '20px',
											}}
											aria-hidden="true"
										>
											{initials || 'U'}
										</div>
										<button type="button" className="btn-secondary btn-sm" onClick={handleLogout}>
											Logout
										</button>
									</div>
								</>
							) : (
								<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
									<button type="button" className="btn-secondary btn-sm" onClick={() => navigate('/login')}>
										Login
									</button>
									<button type="button" className="btn-primary btn-sm" onClick={() => navigate('/register')}>
										Register
									</button>
								</div>
							)}
						</div>
					</>
				)}
			</div>

			{actionError ? (
				<div
					style={{
						width: '100%',
						maxWidth: '1440px',
						paddingLeft: '48px',
						paddingRight: '48px',
						paddingBottom: '8px',
						color: 'var(--error)',
						fontFamily: 'var(--font)',
						fontSize: '14px',
						lineHeight: '20px',
					}}
				>
					{actionError}
				</div>
			) : null}
		</div>
	);
};

export default Navbar;
