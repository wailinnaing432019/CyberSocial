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
    senderId: DataTypes.INTEGER
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