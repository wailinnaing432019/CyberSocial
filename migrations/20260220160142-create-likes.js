'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Likes', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      postId: { type: Sequelize.INTEGER, references: { model: 'Posts', key: 'id' }, onDelete: 'CASCADE' },
      userId: { type: Sequelize.INTEGER, references: { model: 'Users', key: 'id' }, onDelete: 'CASCADE' },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
  },
  down: async (queryInterface) => { await queryInterface.dropTable('Likes'); }
};
