'use strict';
const express = require('express');
const router = express.Router();
const Lecture = require('../models/Lecture');
const Episodes = require('../models/Episodes');
const upload = require('../middleware/upload');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
  const lectureCount = await Lecture.count();
  const episodeCount = await Episodes.count();
  res.render('admin/dashboard', { lectureCount, episodeCount, path: req.path });
});

// ---------------------------------------------------------------------------
// Lectures CRUD
// ---------------------------------------------------------------------------

// List
router.get('/lectures', async (req, res) => {
  const lectures = await Lecture.findAll({ order: [['id', 'DESC']] });
  res.render('admin/lectures_list', { lectures, path: req.path });
});

// Add Form
router.get('/lectures/add', (req, res) => {
  res.render('admin/lecture_form', { lecture: {}, isEdit: false, path: req.path });
});

// Add Submit
router.post('/lectures/add', upload.single('img'), async (req, res) => {
  try {
    const { title, description } = req.body;
    const img = req.file ? `img/${req.file.originalname}` : null;
    await Lecture.create({ title, description, img });
    res.redirect('/admin/lectures');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Edit Form
router.get('/lectures/edit/:id', async (req, res) => {
  const lecture = await Lecture.findByPk(req.params.id);
  if (!lecture) return res.status(404).send('Lecture not found');
  res.render('admin/lecture_form', { lecture, isEdit: true, path: req.path });
});

// Edit Submit
router.post('/lectures/edit/:id', upload.single('img'), async (req, res) => {
  try {
    const lecture = await Lecture.findByPk(req.params.id);
    if (!lecture) return res.status(404).send('Lecture not found');

    const { title, description } = req.body;
    const updateData = { title, description };
    if (req.file) updateData.img = `img/${req.file.originalname}`;

    await lecture.update(updateData);
    res.redirect('/admin/lectures');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Delete
router.post('/lectures/delete/:id', async (req, res) => {
  try {
    const lecture = await Lecture.findByPk(req.params.id);
    if (lecture) await lecture.destroy();
    res.redirect('/admin/lectures');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// ---------------------------------------------------------------------------
// Episodes CRUD
// ---------------------------------------------------------------------------

// List (for a specific lecture)
router.get('/episodes/:lectureId', async (req, res) => {
  const lecture = await Lecture.findByPk(req.params.lectureId);
  if (!lecture) return res.status(404).send('Lecture not found');
  
  const episodes = await Episodes.findAll({
    where: { lecture_id: req.params.lectureId },
    order: [['id', 'DESC']]
  });
  res.render('admin/episodes_list', { lecture, episodes, path: req.path });
});

// Add Form
router.get('/episodes/:lectureId/add', async (req, res) => {
  const lecture = await Lecture.findByPk(req.params.lectureId);
  if (!lecture) return res.status(404).send('Lecture not found');
  res.render('admin/episode_form', { lecture, episode: {}, isEdit: false, path: req.path });
});

// Add Submit
router.post('/episodes/:lectureId/add', upload.fields([{ name: 'video' }, { name: 'audio' }]), async (req, res) => {
  try {
    const { title } = req.body;
    const lectureId = req.params.lectureId;
    const video = req.files['video'] ? `video/${req.files['video'][0].originalname}` : null;
    const audio = req.files['audio'] ? `audio/${req.files['audio'][0].originalname}` : null;

    await Episodes.create({ title, lecture_id: lectureId, video, audio });
    res.redirect(`/admin/episodes/${lectureId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Edit Form
router.get('/episodes/edit/:id', async (req, res) => {
  const episode = await Episodes.findByPk(req.params.id, { include: [{ model: Lecture, as: 'lecture' }] });
  if (!episode) return res.status(404).send('Episode not found');
  res.render('admin/episode_form', { lecture: episode.lecture, episode, isEdit: true, path: req.path });
});

// Edit Submit
router.post('/episodes/edit/:id', upload.fields([{ name: 'video' }, { name: 'audio' }]), async (req, res) => {
  try {
    const episode = await Episodes.findByPk(req.params.id);
    if (!episode) return res.status(404).send('Episode not found');

    const { title } = req.body;
    const updateData = { title };
    if (req.files['video']) updateData.video = `video/${req.files['video'][0].originalname}`;
    if (req.files['audio']) updateData.audio = `audio/${req.files['audio'][0].originalname}`;

    await episode.update(updateData);
    res.redirect(`/admin/episodes/${episode.lecture_id}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Delete
router.post('/episodes/delete/:id', async (req, res) => {
  try {
    const episode = await Episodes.findByPk(req.params.id);
    if (episode) {
      const lectureId = episode.lecture_id;
      await episode.destroy();
      res.redirect(`/admin/episodes/${lectureId}`);
    } else {
      res.redirect('/admin/lectures');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
