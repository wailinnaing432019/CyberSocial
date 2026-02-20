const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

// 1. REGISTER
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Password ကို Hash လုပ်မယ် (Security Best Practice)
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            username,
            email,
            password: hashedPassword
        });

        res.status(201).json({ message: "User registered successfully", userId: newUser.id });
    } catch (err) {
        res.status(400).json({ error: "Registration failed", details: err.message });
    }
});

// 2. LOGIN (Secure Version with JWT)
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(404).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

        // JWT Token ထုတ်ပေးမယ်
        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({ message: "Login successful", token });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;