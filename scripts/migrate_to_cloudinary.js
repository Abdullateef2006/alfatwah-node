'use strict';
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sequelize = require('../database');
const Lecture = require('../models/Lecture');
const Episodes = require('../models/Episodes');
const { uploadFile } = require('../utils/cloudinary');

async function runMigration() {
  console.log('🔄 Initializing Cloudinary migration...');

  // Check env credentials
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    process.env.CLOUDINARY_CLOUD_NAME === 'your_cloud_name' ||
    !process.env.CLOUDINARY_API_KEY ||
    process.env.CLOUDINARY_API_KEY === 'your_api_key' ||
    !process.env.CLOUDINARY_API_SECRET ||
    process.env.CLOUDINARY_API_SECRET === 'your_api_secret'
  ) {
    console.error('❌ Error: Cloudinary credentials are not properly configured in the .env file.');
    console.error('Please configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET before running this script.');
    process.exit(1);
  }

  try {
    await sequelize.authenticate();
    console.log('✅ Connected to the database.');

    const mediaRoot = path.join(__dirname, '..', 'media');
    
    // ----------------------------------------------------
    // 1. Migrate Lecture Images
    // ----------------------------------------------------
    console.log('\n--- Migrating Lecture Images ---');
    const lectures = await Lecture.findAll();
    let lectureCount = 0;

    for (const lecture of lectures) {
      if (lecture.img && !lecture.img.startsWith('http://') && !lecture.img.startsWith('https://')) {
        // Resolve absolute path to the local file
        // Model stores "img/filename.jpg" or sometimes just "filename.jpg"
        let localPath = path.join(mediaRoot, lecture.img);
        if (!fs.existsSync(localPath)) {
          // Try checking if it's inside media/img directly
          localPath = path.join(mediaRoot, 'img', lecture.img);
        }

        if (fs.existsSync(localPath)) {
          console.log(`Uploading lecture image for "${lecture.title}" (${lecture.img})...`);
          try {
            // Note: uploadFile unlinks the path passed to it. 
            // If we want to keep a backup, we can copy the file to a temp location first.
            // Let's copy it to a temp file and upload that, so we don't destroy the user's local media folder backup.
            const tempFile = path.join(path.dirname(localPath), `temp_migrate_${path.basename(localPath)}`);
            fs.copyFileSync(localPath, tempFile);
            
            const cloudinaryUrl = await uploadFile(tempFile);
            if (cloudinaryUrl) {
              await lecture.update({ img: cloudinaryUrl });
              console.log(`✅ Success! Updated Lecture ID ${lecture.id} to URL: ${cloudinaryUrl}`);
              lectureCount++;
            }
          } catch (uploadErr) {
            console.error(`❌ Failed to upload image for Lecture ID ${lecture.id}:`, uploadErr.message);
          }
        } else {
          console.warn(`⚠️ Warning: Local file not found at ${localPath}`);
        }
      }
    }
    console.log(`Migrated ${lectureCount} lecture images.`);

    // ----------------------------------------------------
    // 2. Migrate Episode Media (Video & Audio)
    // ----------------------------------------------------
    console.log('\n--- Migrating Episode Media ---');
    const episodes = await Episodes.findAll();
    let videoCount = 0;
    let audioCount = 0;

    for (const episode of episodes) {
      // Migrate Video
      if (episode.video && !episode.video.startsWith('http://') && !episode.video.startsWith('https://')) {
        let localPath = path.join(mediaRoot, episode.video);
        if (!fs.existsSync(localPath)) {
          localPath = path.join(mediaRoot, 'video', episode.video);
        }

        if (fs.existsSync(localPath)) {
          console.log(`Uploading video for episode "${episode.title}" (${episode.video})...`);
          try {
            const tempFile = path.join(path.dirname(localPath), `temp_migrate_${path.basename(localPath)}`);
            fs.copyFileSync(localPath, tempFile);

            const cloudinaryUrl = await uploadFile(tempFile);
            if (cloudinaryUrl) {
              await episode.update({ video: cloudinaryUrl });
              console.log(`✅ Success! Updated Episode ID ${episode.id} (Video) to URL: ${cloudinaryUrl}`);
              videoCount++;
            }
          } catch (uploadErr) {
            console.error(`❌ Failed to upload video for Episode ID ${episode.id}:`, uploadErr.message);
          }
        } else {
          console.warn(`⚠️ Warning: Local video file not found at ${localPath}`);
        }
      }

      // Migrate Audio
      if (episode.audio && !episode.audio.startsWith('http://') && !episode.audio.startsWith('https://')) {
        let localPath = path.join(mediaRoot, episode.audio);
        if (!fs.existsSync(localPath)) {
          localPath = path.join(mediaRoot, 'audio', episode.audio);
        }

        if (fs.existsSync(localPath)) {
          console.log(`Uploading audio for episode "${episode.title}" (${episode.audio})...`);
          try {
            const tempFile = path.join(path.dirname(localPath), `temp_migrate_${path.basename(localPath)}`);
            fs.copyFileSync(localPath, tempFile);

            const cloudinaryUrl = await uploadFile(tempFile);
            if (cloudinaryUrl) {
              await episode.update({ audio: cloudinaryUrl });
              console.log(`✅ Success! Updated Episode ID ${episode.id} (Audio) to URL: ${cloudinaryUrl}`);
              audioCount++;
            }
          } catch (uploadErr) {
            console.error(`❌ Failed to upload audio for Episode ID ${episode.id}:`, uploadErr.message);
          }
        } else {
          console.warn(`⚠️ Warning: Local audio file not found at ${localPath}`);
        }
      }
    }
    console.log(`Migrated ${videoCount} videos and ${audioCount} audio files.`);
    console.log('\n🎉 Cloudinary migration completed successfully!');
  } catch (err) {
    console.error('❌ Database migration error:', err);
  } finally {
    await sequelize.close();
  }
}

runMigration();
