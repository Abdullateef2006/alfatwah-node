'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../database');
const Episodes = require('./Episodes');

const Questions = sequelize.define('Questions', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  details: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  episode_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Episodes,
      key: 'id',
    },
  },
}, {
  tableName: 'website_questions',  // Match Django's table name
  timestamps: false,
});

// Associations
Episodes.hasMany(Questions, { foreignKey: 'episode_id', as: 'questions' });
Questions.belongsTo(Episodes, { foreignKey: 'episode_id', as: 'episode' });

module.exports = Questions;
