const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key', (err, decoded) => {
        if (err) return res.status(403).json({ message: "Failed to authenticate token" });

        // req.user ထဲကို decoded data တစ်ခုလုံး ထည့်ပေးလိုက်ပါ
        req.user = decoded;
        // အရင်က သုံးထားတဲ့ req.userId ကိုလည်း ဆက်ထားပေးနိုင်ပါတယ် (Compatibility အတွက်)
        req.userId = decoded.id;

        next();
    });
};

module.exports = { verifyToken };