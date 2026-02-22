'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Message extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Message.init({
    text: DataTypes.TEXT,
    room: DataTypes.STRING,
    senderId: DataTypes.INTEGER,
    isEdited: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('sent', 'delivered', 'seen'),
      defaultValue: 'sent'
    },
    seenBy: {
      type: DataTypes.JSON,
      defaultValue: [] // ဖတ်ပြီးသား User ID တွေကို array နဲ့ သိမ်းမယ် [1, 2, 5]
    }
  }, {
    sequelize,
    modelName: 'Message',
  });
  Message.associate = (models) => {
    // senderId က User table ရဲ့ id ကို ညွှန်းထားကြောင်း သတ်မှတ်ရမယ်
    Message.belongsTo(models.User, { foreignKey: 'senderId', as: 'sender' });
  };
  return Message;
};