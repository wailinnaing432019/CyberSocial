const jwt = require('jsonwebtoken'); // ဒီစာကြောင်း ပါရပါမယ်

// Middleware function ကို ဒီထဲမှာပဲ တိုက်ရိုက်ထည့်လိုက်ပါ
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ message: "Failed to authenticate token" });
        req.userId = decoded.id;
        next();
    });
};
module.exports = { verifyToken };