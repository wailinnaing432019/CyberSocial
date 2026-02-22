const express = require('express');
const router = express.Router();
const { Post, User } = require('../models');
const multer = require('multer');
const path = require('path');
const { verifyToken } = require('../middleware/authMiddleware'); // Middleware ခွဲရေးထားရင် သုံးရန်

// ပုံတွေကို uploads/ folder ထဲ သိမ်းဖို့ Multer Setup
const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// GET ALL POSTS (NEWS FEED)
router.get('/', async (req, res) => {
    try {
        const posts = await Post.findAll({
            include: [
                { model: User, attributes: ['username', 'avatar'] },
                {
                    model: Comment,
                    include: [{ model: User, attributes: ['username', 'avatar'] }] // Comment ရေးတဲ့သူနာမည်ပါအောင်
                },
                { model: Like }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json(posts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 1. CREATE Post with Image
router.post('/', verifyToken, upload.single('image'), async (req, res) => {
    try {
        const { content } = req.body;
        const image = req.file;

        // Content ရော Image ရော မပါလာရင် Error ပေးမယ်
        if (!content && !image) {
            return res.status(400).json({ message: "Post content or image is required" });
        }

        const imagePath = image ? `/uploads/${image.filename}` : null;
        const post = await Post.create({
            content: content,
            image: imagePath,
            userId: req.userId
        });
        res.status(201).json(post);
    } catch (err) { res.status(500).json(err); }
});

// GET ONLY MY POSTS
router.get('/my-posts', verifyToken, async (req, res) => {
    try {
        const posts = await Post.findAll({
            where: { userId: req.userId },
            include: [
                { model: Like }, // Like တွေ ပါအောင်
                { model: Comment, include: [{ model: User, attributes: ['username', 'avatar'] }] } // Comment တွေ ပါအောင်
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json(posts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 1. EDIT POST
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const post = await Post.findOne({ where: { id: req.params.id, userId: req.userId } });
        if (!post) return res.status(403).json("You can only edit your own posts");

        post.content = req.body.content;
        await post.save();
        res.json(post);
    } catch (err) { res.status(500).json(err); }
});

// 2. DELETE Post (ကိုယ်ပိုင်မှ ဖျက်လို့ရအောင် စစ်မယ်)
router.delete('/:id', verifyToken, async (req, res) => {
    const post = await Post.findOne({ where: { id: req.params.id, userId: req.userId } });
    if (!post) return res.status(403).json({ message: "Unauthorized or Not Found" });

    await post.destroy();
    res.json({ message: "Post deleted" });
});

router.get('/search', async (req, res) => {
    try {
        const { q } = req.query;
        const posts = await Post.findAll({
            where: {
                content: { [Op.like]: `%${q}%` }
            },
            include: [{ model: User, attributes: ['username', 'avatar'] }, { model: Like }, { model: Comment }],
            order: [['createdAt', 'DESC']]
        });
        res.json(posts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// 3. UPDATE Post
router.put('/:id', verifyToken, async (req, res) => {
    const post = await Post.findOne({ where: { id: req.params.id, userId: req.userId } });
    if (!post) return res.status(403).json({ message: "Unauthorized" });

    post.content = req.body.content;
    await post.save();
    res.json(post);
});

const { Comment, Like } = require('../models');

// 1. ADD COMMENT
router.post('/:id/comment', verifyToken, async (req, res) => {
    try {
        const comment = await Comment.create({
            text: req.body.text,
            postId: req.params.id,
            userId: req.userId
        });
        res.json(comment);
    } catch (err) { res.status(500).json(err); }
});

// 2. TOGGLE LIKE (Like မရှိရင် ထည့်မယ်၊ ရှိရင် ဖြုတ်မယ်)
router.post('/:id/like', verifyToken, async (req, res) => {
    try {
        const existingLike = await Like.findOne({ where: { postId: req.params.id, userId: req.userId } });
        if (existingLike) {
            await existingLike.destroy();
            return res.json({ liked: false });
        }
        await Like.create({ postId: req.params.id, userId: req.userId });
        res.json({ liked: true });
    } catch (err) { res.status(500).json(err); }
});

module.exports = router;