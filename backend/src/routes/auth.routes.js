const express = require('express');
const { registerUser, loginUser } = require('../services/auth.service');

const router = express.Router();

router.post('/register', async (req, res) => {
	try {
		const { name, email, password, role } = req.body;
		const user = await registerUser(name, email, password, role);
		return res.status(201).json({ data: user });
	} catch (error) {
		return res.status(400).json({ error: error.message });
	}
});

router.post('/login', async (req, res) => {
	try {
		const { email, password } = req.body;
		const { user, token } = await loginUser(email, password);
		return res.status(200).json({ data: { user, token } });
	} catch (error) {
		return res.status(401).json({ error: 'Invalid credentials' });
	}
});

module.exports = router;
