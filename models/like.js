module.exports = (sequelize, DataTypes) => {
    const Like = sequelize.define('Like', {
        // ပုံမှန်အားဖြင့် ID တွေပဲ လိုပါတယ်
    });

    Like.associate = (models) => {
        Like.belongsTo(models.User, { foreignKey: 'userId' });
        Like.belongsTo(models.Post, { foreignKey: 'postId' });
    };

    return Like;
};