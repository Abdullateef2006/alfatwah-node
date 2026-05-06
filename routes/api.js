'use strict';
const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');

const Lecture = require('../models/Lecture');
const Episodes = require('../models/Episodes');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build next/previous page URLs — mirrors DRF PageNumberPagination response shape:
 * { count, next, previous, results }
 */
const buildPaginatedResponse = (req, allItems, page, pageSize) => {
  const count = allItems.length;
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const currentPage = Math.min(Math.max(1, parseInt(page) || 1), totalPages);
  const start = (currentPage - 1) * pageSize;
  const results = allItems.slice(start, start + pageSize);

  const baseUrl = `${req.protocol}://${req.get('host')}${req.path}`;
  const qs = req.query.search ? `&search=${encodeURIComponent(req.query.search)}` : '';

  return {
    count,
    next: currentPage < totalPages ? `${baseUrl}?page=${currentPage + 1}${qs}` : null,
    previous: currentPage > 1 ? `${baseUrl}?page=${currentPage - 1}${qs}` : null,
    results,
  };
};

// ---------------------------------------------------------------------------
// GET /lecturesApi/
// Paginated + searchable lecture list — mirrors DRF LectureListView (page_size=6)
// ---------------------------------------------------------------------------
router.get('/lecturesApi/', async (req, res) => {
  try {
    const search = req.query.search || '';
    const whereClause = search
      ? {
          [Op.or]: [
            { title: { [Op.like]: `%${search}%` } },
            { description: { [Op.like]: `%${search}%` } },
          ],
        }
      : {};

    const lectures = await Lecture.findAll({
      where: whereClause,
      order: [['id', 'ASC']],
    });

    const serialized = lectures.map((l) => ({
      id: l.id,
      title: l.title,
      description: l.description,
      img: l.img ? `/media/${l.img}` : null,
    }));

    const paginated = buildPaginatedResponse(req, serialized, req.query.page, 6);
    res.json(paginated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /lecturesApi/:id/
// Lecture detail + its episodes — mirrors LectureDetailView
// ---------------------------------------------------------------------------
router.get('/lecturesApi/:id/', async (req, res) => {
  try {
    const lecture = await Lecture.findByPk(req.params.id);
    if (!lecture) return res.status(404).json({ detail: 'Not found.' });

    const episodes = await Episodes.findAll({
      where: { lecture_id: req.params.id },
      order: [['id', 'ASC']],
    });

    res.json({
      lecture: {
        id: lecture.id,
        title: lecture.title,
        description: lecture.description,
        img: lecture.img ? `/media/${lecture.img}` : null,
      },
      episodes: episodes.map((e) => ({
        video: e.video ? `/media/${e.video}` : null,
        audio: e.audio ? `/media/${e.audio}` : null,
        title: e.title,
        lecture: e.lecture_id,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: 'Server error' });
  }
});

module.exports = router;
