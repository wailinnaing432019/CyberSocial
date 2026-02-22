module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
        username: { type: DataTypes.STRING, allowNull: false, unique: true },
        email: { type: DataTypes.STRING, allowNull: false, unique: true },
        password: { type: DataTypes.STRING, allowNull: false },
        // Field အသစ်များ ထည့်ခြင်း
        fullName: { type: DataTypes.STRING, allowNull: true },
        birthday: { type: DataTypes.DATEONLY, allowNull: true }, // နေ့စွဲသက်သက် သိမ်းရန်
        bio: { type: DataTypes.TEXT, allowNull: true },
        avatar: { type: DataTypes.STRING, defaultValue: '/uploads/default.png' }
    });

    User.associate = (models) => {
        User.hasMany(models.Post, { foreignKey: 'userId' });
        User.hasMany(models.Comment, { foreignKey: 'userId' });
        User.hasMany(models.Like, { foreignKey: 'userId' });
        User.hasMany(models.Message, { foreignKey: 'senderId' });
    };

    return User;
};