const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
	const authHeader = req.headers.authorization;

	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return res.status(401).json({ error: 'No token provided' });
	}

	const token = authHeader.split(' ')[1];

	try {
		const payload = jwt.verify(token, process.env.JWT_SECRET);
		req.user = {
			id: payload.id,
			email: payload.email,
			role: payload.role,
		};
		return next();
	} catch (error) {
		return res.status(401).json({ error: 'Invalid token' });
	}
}

function requireInstructor(req, res, next) {
	const checkRole = () => {
		if (!req.user || req.user.role !== 'INSTRUCTOR') {
			return res.status(403).json({ error: 'Instructor access required' });
		}

		return next();
	};

	if (!req.user) {
		return authenticate(req, res, checkRole);
	}

	return checkRole();
}

module.exports = {
	authenticate,
	requireInstructor,
};
