module.exports = (sequelize, DataTypes) => {
    const Comment = sequelize.define('Comment', {
        text: { type: DataTypes.TEXT, allowNull: false }
    });

    Comment.associate = (models) => {
        // Comment တစ်ခုက User တစ်ယောက်နဲ့ Post တစ်ခုစီမှာ သက်ဆိုင်တယ်
        Comment.belongsTo(models.User, { foreignKey: 'userId' });
        Comment.belongsTo(models.Post, { foreignKey: 'postId' });
    };

    return Comment;
};