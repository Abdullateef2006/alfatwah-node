'use strict';
const express = require('express');
const router = express.Router();
const Lecture = require('../models/Lecture');
const Episodes = require('../models/Episodes');
const upload = require('../middleware/upload');
const { uploadFile, deleteFromCloudinary, generateSignature } = require('../utils/cloudinary');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Signature endpoint for client-side direct uploads
// ---------------------------------------------------------------------------
router.post('/cloudinary-signature', (req, res) => {
  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const paramsToSign = {
      timestamp: timestamp,
      folder: 'alfatwa',
    };
    const signature = generateSignature(paramsToSign);
    res.json({
      signature,
      timestamp,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'dltgnmg1v',
      apiKey: process.env.CLOUDINARY_API_KEY || '738298728812741',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate upload signature' });
  }
});

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
    let img = req.body.img_url || null;
    if (req.file) {
      img = await uploadFile(req.file.path);
    }
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

    if (req.body.img_url) {
      if (lecture.img) {
        await deleteFromCloudinary(lecture.img);
      }
      updateData.img = req.body.img_url;
    } else if (req.file) {
      if (lecture.img) {
        await deleteFromCloudinary(lecture.img);
      }
      updateData.img = await uploadFile(req.file.path);
    }

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
    if (lecture) {
      if (lecture.img) {
        await deleteFromCloudinary(lecture.img);
      }
      await lecture.destroy();
    }
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
    
    let video = req.body.video_url || null;
    if (req.files && req.files['video']) {
      video = await uploadFile(req.files['video'][0].path);
    }
    
    let audio = req.body.audio_url || null;
    if (req.files && req.files['audio']) {
      audio = await uploadFile(req.files['audio'][0].path);
    }

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

    if (req.body.video_url) {
      if (episode.video) {
        await deleteFromCloudinary(episode.video);
      }
      updateData.video = req.body.video_url;
    } else if (req.files && req.files['video']) {
      if (episode.video) {
        await deleteFromCloudinary(episode.video);
      }
      updateData.video = await uploadFile(req.files['video'][0].path);
    }

    if (req.body.audio_url) {
      if (episode.audio) {
        await deleteFromCloudinary(episode.audio);
      }
      updateData.audio = req.body.audio_url;
    } else if (req.files && req.files['audio']) {
      if (episode.audio) {
        await deleteFromCloudinary(episode.audio);
      }
      updateData.audio = await uploadFile(req.files['audio'][0].path);
    }

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
      if (episode.video) {
        await deleteFromCloudinary(episode.video);
      }
      if (episode.audio) {
        await deleteFromCloudinary(episode.audio);
      }
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
