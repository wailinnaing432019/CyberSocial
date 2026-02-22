'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // status column ထည့်မယ်
    await queryInterface.addColumn('Messages', 'status', {
      type: Sequelize.ENUM('sent', 'delivered', 'seen'),
      defaultValue: 'sent'
    });

    // seenBy column ထည့်မယ် (Group chat အတွက်ပါ ရည်ရွယ်ရင် JSON နဲ့သိမ်းတာ အကောင်းဆုံး)
    await queryInterface.addColumn('Messages', 'seenBy', {
      type: Sequelize.JSON,
      defaultValue: []
    });
  },

  down: async (queryInterface, Sequelize) => {
    // မှားသွားရင် ပြန်ဖြုတ်ဖို့
    await queryInterface.removeColumn('Messages', 'status');
    await queryInterface.removeColumn('Messages', 'seenBy');
  }
};
