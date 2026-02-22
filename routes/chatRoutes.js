const express = require('express');
const router = express.Router();
const multer = require('multer');

const fs = require('fs');
const path = require('path');

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
router.post('/upload', uploadForChat.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const imageUrl = `/uploads/chat/${req.file.filename}`;
    res.json({ imageUrl });
});
module.exports = router;