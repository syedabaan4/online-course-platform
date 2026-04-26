import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyCertificates } from '../../api/certificate.api';

const normalizePayload = (payload) => payload?.data ?? payload;

const font = { fontFamily: 'var(--font)' };

const MyCertificates = () => {
	const [list, setList] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [loadError, setLoadError] = useState('');

	const load = useCallback(async () => {
		setIsLoading(true);
		setLoadError('');
		try {
			const res = await getMyCertificates();
			const data = normalizePayload(res);
			setList(Array.isArray(data) ? data : []);
		} catch (e) {
			setLoadError(String(e));
			setList([]);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		const t = setTimeout(() => {
			void load();
		}, 0);
		return () => clearTimeout(t);
	}, [load]);

	if (isLoading) {
		return (
			<main
				className="page-fade"
				style={{
					...font,
					minHeight: 'calc(100vh - 64px)',
					background: 'var(--bg-surface-alt)',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
				}}
			>
				<div className="spinner" />
			</main>
		);
	}

	return (
		<div
			className="page-fade"
			style={{
				...font,
				minHeight: 'calc(100vh - 64px)',
				background: 'var(--bg-surface-alt)',
				padding: '32px 24px 48px',
				boxSizing: 'border-box',
			}}
		>
			<div style={{ width: '100%', maxWidth: 1024, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
				<header
					style={{
						paddingBottom: 24,
						borderBottom: '1px solid var(--border)',
						display: 'flex',
						flexDirection: 'column',
						gap: 4,
					}}
				>
					<div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
						<MedalIcon size={16} color="var(--text-primary)" />
						<span
							style={{
								color: 'var(--text-primary)',
								fontSize: 14,
								fontWeight: 700,
								textTransform: 'uppercase',
								letterSpacing: '0.7px',
							}}
						>
							Achievements
						</span>
					</div>
					<h1 style={{ color: 'var(--text-primary)', fontSize: 32, fontWeight: 900, lineHeight: 1.2, margin: 0 }}>My Certificates</h1>
					<p style={{ color: 'var(--text-muted)', fontSize: 16, lineHeight: '24px', margin: 0, maxWidth: 560 }}>
						View and download certificates for courses you have fully completed.
					</p>
				</header>

				{loadError && (
					<div style={{ color: 'var(--error)', fontSize: 14 }} role="alert">
						{loadError}
					</div>
				)}

				{!list.length && !loadError ? (
					<div className="empty-state" style={{ minHeight: 200 }}>
						<p style={{ color: 'var(--text-secondary)', fontSize: 16, maxWidth: 400, margin: 0 }}>
							You do not have any certificates yet. Finish a course and pass all module quizzes to earn one.
						</p>
						<Link to="/my-courses" className="btn-primary" style={{ marginTop: 8 }}>
							Go to My Learning
						</Link>
					</div>
				) : (
					<ul
						style={{
							listStyle: 'none',
							margin: 0,
							padding: 0,
							display: 'flex',
							flexDirection: 'column',
							gap: 16,
						}}
					>
						{list.map((row) => (
							<li key={row.certificateId || row.id}>
								<CertificateListCard row={row} />
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}

function CertificateListCard({ row }) {
	const title = row.course?.title || 'Course';
	const issued = row.issuedAt ? new Date(row.issuedAt) : null;
	const dateStr = issued
		? issued.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
		: '—';
	const cid = row.certificateId || '';
	const href = `/certificates/${encodeURIComponent(cid)}`;
	const category = row.course?.category;

	return (
		<div
			className="card"
			style={{
				display: 'flex',
				flexWrap: 'wrap',
				alignItems: 'center',
				justifyContent: 'space-between',
				gap: 16,
				padding: 20,
			}}
		>
			<div style={{ minWidth: 0, flex: '1 1 240px' }}>
				<div style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 700, lineHeight: '24px', marginBottom: 4 }}>{title}</div>
				<div style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: '20px' }}>
					{category && <span style={{ textTransform: 'capitalize' }}>{String(category).toLowerCase().replace(/_/g, ' ')} · </span>}
					Issued {dateStr}
				</div>
				<div
					style={{
						marginTop: 8,
						fontSize: 12,
						fontFamily: 'var(--font-mono)',
						color: 'var(--text-secondary)',
						letterSpacing: '0.4px',
					}}
				>
					{cid}
				</div>
			</div>
			<Link
				to={href}
				className="btn-primary"
				style={{ fontSize: 14, padding: '10px 20px', textDecoration: 'none', display: 'inline-flex' }}
			>
				View certificate
			</Link>
		</div>
	);
}

function MedalIcon({ size, color }) {
	return (
		<svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
			<path
				d="M10 2L12.5 7L18 7.5L14 11L15 17L10 14L5 17L6 11L2 7.5L7.5 7L10 2Z"
				stroke={color}
				strokeWidth="1.2"
				fill="none"
			/>
		</svg>
	);
}

export default MyCertificates;
