'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Lecture = sequelize.define('Lecture', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: '',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '',
  },
  img: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
}, {
  tableName: 'website_lecture',  // Match Django's auto-generated table name
  timestamps: false,
});

module.exports = Lecture;
