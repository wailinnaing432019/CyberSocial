const express = require('express');
const router = express.Router();
const multer = require('multer');

const fs = require('fs');
const path = require('path');
const { verifyToken } = require('../middleware/authMiddleware');
const { Message } = require('../models');
const chatDir = path.join(__dirname, '../uploads/chat');
if (!fs.existsSync(chatDir)) {
    fs.mkdirSync(chatDir, { recursive: true });
}

// Chat Image Upload အတွက် Multer Setup
const storageForChat = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, 'uploads/chat/'); },
    filename: (req, file, cb) => { cb(null, Date.now() + '-' + file.originalname); }
});
const uploadForChat = multer({ storage: storageForChat });

// API Route for Chat Image Upload
const { Op } = require('sequelize');
router.post('/upload', uploadForChat.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const imageUrl = `/uploads/chat/${req.file.filename}`;
    res.json({ imageUrl });
});

// update message seen status API
router.put('/seen/:roomName', verifyToken, async (req, res) => {
    try {
        const { roomName } = req.params;
        console.log("Marking messages as seen in room:", roomName);
        const myId = req.userId;

        // ကိုယ်မဟုတ်တဲ့သူ ပို့ထားတဲ့ 'sent' message တွေကို 'seen' ပြောင်းမယ်
        await Message.update(
            { status: 'seen' },
            {
                where: {
                    room: roomName,
                    senderId: { [Op.ne]: myId },
                    status: 'sent'
                }
            }
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// routes/chatRoutes.js
router.get('/unread-all', verifyToken, async (req, res) => {
    try {
        const myId = req.userId; // ကိုယ့်ရဲ့ ID

        const messages = await Message.findAll({
            where: {
                status: 'sent',
                // 🔥 အဓိကအချက်- ကိုယ့်ဆီ လာတဲ့စာဖြစ်ရမယ်
                // အစ်ကို့ Room နာမည်က "ID_ID" ဆိုတော့ room string ထဲမှာ ကိုယ့် ID ပါတာကို စစ်ရမယ်
                [Op.and]: [
                    { room: { [Op.like]: `%${myId}%` } }, // Room ထဲမှာ ကိုယ့် ID ပါရမယ်
                    { senderId: { [Op.ne]: myId } }      // ဒါပေမဲ့ ပို့တဲ့သူက ကိုယ်မဖြစ်ရဘူး
                ]
            }
        });

        const counts = {};
        messages.forEach(m => {
            // ပို့တဲ့သူ (Sender) အလိုက် စာရင်းမှတ်မယ်
            counts[m.senderId] = (counts[m.senderId] || 0) + 1;
        });

        res.json(counts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
module.exports = router;