import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const { user, isLoading, isAuthenticated, isInstructor, logout } = useAuth();
	const [actionError, setActionError] = useState('');
	const [userMenuOpen, setUserMenuOpen] = useState(false);
	const userMenuRef = useRef(null);

	const closeUserMenu = useCallback(() => {
		setUserMenuOpen(false);
	}, []);

	useEffect(() => {
		if (!userMenuOpen) return;

		const onDown = (e) => {
			if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
				setUserMenuOpen(false);
			}
		};
		const onKey = (e) => {
			if (e.key === 'Escape') setUserMenuOpen(false);
		};

		document.addEventListener('mousedown', onDown);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('mousedown', onDown);
			document.removeEventListener('keydown', onKey);
		};
	}, [userMenuOpen]);

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
			closeUserMenu();
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
							<Link to="/" className="navbar-logo">
								Coursly<span className="navbar-logo__period" aria-hidden="true">.</span>
							</Link>

							<div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '24px' }}>
								{navLinks.map((link) => {
									const isActive = location.pathname === link.to;

									return (
										<Link
											key={link.to}
											to={link.to}
											className={isActive ? 'navbar-nav-link navbar-nav-link--active' : 'navbar-nav-link'}
										>
											<span className="navbar-nav-link__label">{link.label}</span>
										</Link>
									);
								})}
							</div>
						</div>

						<div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '16px' }}>
							{isAuthenticated ? (
								<div ref={userMenuRef} className="navbar-user-menu" style={{ position: 'relative' }}>
									<button
										type="button"
										className="navbar-user-menu__trigger"
										aria-haspopup="menu"
										aria-expanded={userMenuOpen}
										onClick={() => setUserMenuOpen((o) => !o)}
									>
										<div
											className="navbar-user-menu__text"
											style={{ display: 'inline-flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-end', gap: '4px' }}
										>
											<span
												style={{
													color: 'var(--text-primary)',
													fontSize: '14px',
													fontFamily: 'var(--font)',
													fontWeight: 600,
													lineHeight: '14px',
												}}
											>
												{displayName}
											</span>
											<span
												style={{
													color: 'var(--text-muted)',
													fontSize: '12px',
													fontFamily: 'var(--font)',
													fontWeight: 400,
													lineHeight: '16px',
												}}
											>
												{roleLabel}
											</span>
										</div>
										<div
											className="navbar-user-menu__avatar"
											style={{
												width: '40px',
												height: '40px',
												background: 'var(--border)',
												overflow: 'hidden',
												borderRadius: 'var(--radius-pill)',
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
									</button>
									{userMenuOpen ? (
										<div
											className="navbar-user-menu__panel"
											role="menu"
											aria-orientation="vertical"
											style={{
												position: 'absolute',
												top: 'calc(100% + 8px)',
												right: 0,
												minWidth: '160px',
												padding: '4px',
												background: 'var(--bg-surface)',
												border: '1px solid var(--border)',
												borderRadius: 'var(--radius)',
												boxShadow: 'var(--shadow-elevated)',
												zIndex: 200,
											}}
										>
											<button
												type="button"
												role="menuitem"
												className="navbar-user-menu__item"
												onClick={handleLogout}
											>
												Log out
											</button>
										</div>
									) : null}
								</div>
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
