'use strict';
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure media subdirectories exist
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'media/img';
    if (file.fieldname === 'video') folder = 'media/video';
    else if (file.fieldname === 'audio') folder = 'media/audio';
    ensureDir(folder);
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    // Preserve original filename (Django behaviour)
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

module.exports = upload;
