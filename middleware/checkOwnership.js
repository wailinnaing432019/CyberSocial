const isProfileOwner = (req, targetId) => {
    // req.user က verifyToken ကနေ လာတာ
    // targetId က URL ကနေ လာတာ
    return Number(req.user.id) === Number(targetId);
};

module.exports = { isProfileOwner };