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
const { User, Message } = require('../models');
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
        const { bio, email, fullName, birthday } = req.body;
        const updateData = { bio, email, fullName, birthday };

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
    const user = await User.findByPk(req.userId, { attributes: ['id', 'username', 'email', 'fullName', 'birthday', 'bio', 'avatar'] });
    res.json(user);
});

const { Op } = require('sequelize');
router.get('/all', verifyToken, async (req, res) => {

    try {
        console.log("Current User from Token:", req.user); // ဒါကို အရင်စစ်ပါ
        const users = await User.findAll({
            where: {
                id: { [Op.ne]: req.user.id } // ကိုယ့်အကောင့်ကို စာရင်းထဲမှာ ပြန်မပြအောင်
            },
            attributes: ['id', 'username', 'avatar', 'bio'] // လိုအပ်တဲ့ data ပဲပို့မယ် (Security)
        });
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: "Users ဆွဲလို့မရပါဘူး" });
    }
});

//  get all users
router.get('/', verifyToken, async (req, res) => {
    try {
        // password ကလွဲပြီး ကျန်တဲ့ data တွေအကုန်ယူမယ်
        const users = await User.findAll({
            attributes: { exclude: ['password'] }
        });
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: "Error fetching users" });
    }
});

// chatting
// routes/chat.js
router.get('/history/:room', verifyToken, async (req, res) => {
    try {
        const messages = await Message.findAll({
            where: { room: req.params.room },
            include: [{ model: User, as: 'sender', attributes: ['username', 'avatar'] }],
            order: [['createdAt', 'ASC']],
            limit: 50 // နောက်ဆုံးစာ ၅၀ ပဲ ယူမယ်
        });
        res.json(messages);
    } catch (err) {
        res.status(500).send("History error");
    }
});

// history chat 
// routes/userRoutes.js 

router.get('/chat-history/:room', verifyToken, async (req, res) => {
    try {
        const { room } = req.params;

        // ဒီ room ထဲက နောက်ဆုံးစာ ၅၀ ကို အရင်ကနေ နောက်ဆုံးစဉ်ပြီး ယူမယ်
        const messages = await Message.findAll({
            where: { room: room },
            attributes: ['id', 'text', 'room', 'senderId', 'createdAt', 'isEdited', 'image'], // လိုအပ်တဲ့ field တွေ
            include: [{
                model: User,
                as: 'sender', // Model ထဲမှာ associate လုပ်ထားတဲ့ နာမည်
                attributes: ['username', 'avatar']
            }],
            order: [['createdAt', 'ASC']],
            limit: 50
        });

        res.json(messages);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "History ဆွဲလို့မရပါဘူး" });
    }
});


module.exports = router;