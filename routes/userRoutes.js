// routes/userRoutes.js
// const express = require('express');
// const router = express.Router();
// const { User, sequelize } = require('../models');

// router.get('/search', async (req, res) => {
//     const username = req.query.username;

//     // ❌ VULNERABLE: String Concatenation for SQL Injection
//     const sql = `SELECT id, username, bio FROM Users WHERE username = '${username}'`;

//     try {
//         const [results] = await sequelize.query(sql);
//         res.json(results);
//     } catch (err) {
//         res.status(500).json({ error: "Database Error", details: err.message });
//     }
// });

// module.exports = router;

const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { verifyToken } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// Profile Picture သိမ်းရန် Multer Setup
const storage = multer.diskStorage({
    destination: './public/uploads/avatars/',
    filename: (req, file, cb) => {
        cb(null, 'avatar-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// UPDATE PROFILE
router.put('/profile', verifyToken, upload.single('avatar'), async (req, res) => {
    try {
        const { bio } = req.body;
        const updateData = { bio };

        if (req.file) {
            updateData.avatar = `/uploads/avatars/${req.file.filename}`;
        }

        await User.update(updateData, { where: { id: req.userId } });
        res.json({ message: "Profile updated successfully!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET PROFILE INFO
router.get('/me', verifyToken, async (req, res) => {
    const user = await User.findByPk(req.userId, { attributes: ['id', 'username', 'email', 'bio', 'avatar'] });
    res.json(user);
});

module.exports = router;