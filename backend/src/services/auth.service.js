const prisma = require('../prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

async function registerUser(name, email, password, role = 'STUDENT') {
	const existingUser = await prisma.user.findUnique({
		where: { email },
	});

	if (existingUser) {
		throw new Error('Email already in use');
	}

	const hashedPassword = await bcrypt.hash(password, 10);

	const createdUser = await prisma.user.create({
		data: {
			name,
			email,
			password: hashedPassword,
			role,
		},
	});

	const { password: _password, ...userWithoutPassword } = createdUser;
	return userWithoutPassword;
}

async function loginUser(email, password) {
	const user = await prisma.user.findUnique({
		where: { email },
	});

	if (!user) {
		throw new Error('Invalid credentials');
	}

	const isPasswordValid = await bcrypt.compare(password, user.password);

	if (!isPasswordValid) {
		throw new Error('Invalid credentials');
	}

	const token = jwt.sign(
		{
			id: user.id,
			email: user.email,
			role: user.role,
		},
		process.env.JWT_SECRET,
		{ expiresIn: '7d' }
	);

	const { password: _password, ...userWithoutPassword } = user;

	return {
		user: userWithoutPassword,
		token,
	};
}

module.exports = {
	registerUser,
	loginUser,
};
