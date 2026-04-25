/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { loginUser, registerUser } from '../api/auth.api.js';

const AuthContext = createContext();

const normalizeAuthPayload = (payload) => payload?.data ?? payload ?? {};

const normalizeRole = (role) => String(role || '').toUpperCase();

const getInitialAuthState = () => {
	try {
		const storedUser = localStorage.getItem('user');
		const storedToken = localStorage.getItem('token');

		return {
			user: storedUser ? JSON.parse(storedUser) : null,
			token: storedToken || null,
		};
	} catch {
		localStorage.removeItem('user');
		localStorage.removeItem('token');
		return { user: null, token: null };
	}
};

export const AuthProvider = ({ children }) => {
	const [authState, setAuthState] = useState(getInitialAuthState);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const frameId = requestAnimationFrame(() => {
			setIsLoading(false);
		});

		return () => cancelAnimationFrame(frameId);
	}, []);

	const login = async (email, password) => {
		const payload = await loginUser(email, password);
		const data = normalizeAuthPayload(payload);
		const nextUser = data?.user ? { ...data.user, role: normalizeRole(data.user.role) } : null;
		const nextToken = data?.token || null;

		if (!nextUser || !nextToken) {
			throw new Error('Invalid authentication response from server.');
		}

		localStorage.setItem('user', JSON.stringify(nextUser));
		localStorage.setItem('token', nextToken);

		setAuthState((prev) => ({
			...prev,
			user: nextUser,
			token: nextToken,
		}));

		return nextUser;
	};

	const register = async (name, email, password, role) => {
		await registerUser(name, email, password, normalizeRole(role));
		return true;
	};

	const logout = () => {
		localStorage.removeItem('user');
		localStorage.removeItem('token');
		setAuthState((prev) => ({ ...prev, user: null, token: null }));
	};

	const value = useMemo(
		() => ({
			user: authState.user,
			token: authState.token,
			isLoading,
			login,
			register,
			logout,
			isAuthenticated: authState.user !== null,
			isInstructor: normalizeRole(authState.user?.role) === 'INSTRUCTOR',
		}),
		[authState, isLoading]
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
	const context = useContext(AuthContext);

	if (!context) {
		throw new Error('useAuth must be used within an AuthProvider');
	}

	return context;
};
