'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../database');
const Lecture = require('./Lecture');

const Episodes = sequelize.define('Episodes', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  video: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  audio: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  title: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  lecture_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Lecture,
      key: 'id',
    },
  },
}, {
  tableName: 'website_episodes',  // Match Django's table name
  timestamps: false,
});

// Associations
Lecture.hasMany(Episodes, { foreignKey: 'lecture_id', as: 'episodes' });
Episodes.belongsTo(Lecture, { foreignKey: 'lecture_id', as: 'lecture' });

module.exports = Episodes;
