'use strict';
require('dotenv').config();

const express = require('express');
const path = require('path');
const methodOverride = require('method-override');

// Import models to trigger associations
require('./models/Lecture');
require('./models/Episodes');
require('./models/Questions');

const sequelize = require('./database');
const webRoutes = require('./routes/web');
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 8080;

// ---------------------------------------------------------------------------
// View engine
// ---------------------------------------------------------------------------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(express.urlencoded({ extended: true }));   // Parse POST form bodies
app.use(express.json());
app.use(methodOverride('_method'));

// Static files — mirrors Django's STATICFILES_DIRS + WhiteNoise
app.use('/static', express.static(path.join(__dirname, 'public')));

// Media files — mirrors Django's MEDIA_URL / MEDIA_ROOT
app.use('/media', express.static(path.join(__dirname, 'media')));

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use('/', webRoutes);
app.use('/', apiRoutes);
app.use('/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).send('<h1>404 - Page Not Found</h1>');
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
sequelize
  .authenticate()
  .then(() => {
    console.log('✅ Database connected.');
    return sequelize.sync({ alter: false }); // Don't change existing tables
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Al-Fatwa Node.js server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Unable to connect to database:', err);
    process.exit(1);
  });
