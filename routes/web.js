'use strict';
const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');

const Lecture = require('../models/Lecture');
const Episodes = require('../models/Episodes');
const Questions = require('../models/Questions');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a URL prefix for media files (mirrors Django's MEDIA_URL = 'media/') */
const mediaUrl = (filePath) => (filePath ? `/media/${filePath}` : null);

/** Paginate an array and return a page object compatible with the EJS paginator */
const paginate = (items, pageNumber, pageSize) => {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(1, parseInt(pageNumber) || 1), totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  return {
    items: pageItems,
    number: currentPage,
    numPages: totalPages,
    hasPrevious: currentPage > 1,
    hasNext: currentPage < totalPages,
    previousPageNumber: currentPage - 1,
    nextPageNumber: currentPage + 1,
  };
};

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * GET /
 * Home page
 */
router.get('/', (req, res) => {
  res.render('home', {
    query: null,
    count: 0,
    lectures: [],
    lecture: null,
    path: req.path,
  });
});

/**
 * GET /list/
 * Lecture list with pagination (8 per page — matches Django view)
 */
router.get('/list/', async (req, res) => {
  try {
    const allLectures = await Lecture.findAll({ order: [['id', 'ASC']] });
    const page = paginate(allLectures, req.query.page, 8);

    // Attach media URLs to each lecture item
    page.items = page.items.map((l) => ({
      ...l.toJSON(),
      imgUrl: l.img ? `/media/${l.img}` : null,
    }));

    res.render('lecture_list', { lecture: page, path: req.path });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

/**
 * GET /lecture/:id/
 * Lecture detail page — shows all episodes of a lecture
 */
router.get('/lecture/:id/', async (req, res) => {
  try {
    const lecture = await Lecture.findByPk(req.params.id);
    if (!lecture) return res.status(404).send('Lecture not found');

    const episodes = await Episodes.findAll({
      where: { lecture_id: req.params.id },
      order: [['id', 'ASC']],
    });

    res.render('details', {
      lecture: { ...lecture.toJSON(), imgUrl: lecture.img ? `/media/${lecture.img}` : null },
      episodes: episodes.map((e) => ({
        ...e.toJSON(),
        lectureTitle: lecture.title,
      })),
      path: req.path,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

/**
 * GET  /lectures/episodes/:id/  — view episode + questions
 * POST /lectures/episodes/:id/  — submit a question, then redirect
 */
router.get('/lectures/episodes/:id/', async (req, res) => {
  try {
    const episode = await Episodes.findByPk(req.params.id, {
      include: [{ model: Lecture, as: 'lecture' }],
    });
    if (!episode) return res.status(404).send('Episode not found');

    const questions = await Questions.findAll({
      where: { episode_id: req.params.id },
      order: [['id', 'ASC']],
    });

    res.render('episodes', {
      episodes: {
        ...episode.toJSON(),
        videoUrl: episode.video ? `/media/${episode.video}` : null,
        audioUrl: episode.audio ? `/media/${episode.audio}` : null,
      },
      question: questions.map((q) => q.toJSON()),
      path: req.path,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

router.post('/lectures/episodes/:id/', async (req, res) => {
  try {
    const episode = await Episodes.findByPk(req.params.id);
    if (!episode) return res.status(404).send('Episode not found');

    const questionText = req.body.question;
    if (questionText && questionText.trim()) {
      await Questions.create({ details: questionText.trim(), episode_id: episode.id });
    }

    // Redirect back (mirrors Django's redirect('episode', id=id))
    res.redirect(`/lectures/episodes/${req.params.id}/`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

/**
 * GET  /search/  — render empty home
 * POST /search/  — search lectures by title or description
 */
router.get('/search/', (req, res) => {
  res.render('home', { query: null, count: 0, lectures: [], lecture: null, path: req.path });
});

router.post('/search/', async (req, res) => {
  try {
    const query = (req.body.search || '').trim();
    const lectures = await Lecture.findAll({
      where: {
        [Op.or]: [
          { title: { [Op.like]: `%${query}%` } },
          { description: { [Op.like]: `%${query}%` } },
        ],
      },
    });

    res.render('home', {
      query,
      count: lectures.length,
      lectures: lectures.map((l) => ({
        ...l.toJSON(),
        imgUrl: l.img ? `/media/${l.img}` : null,
      })),
      lecture: null,
      path: req.path,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
