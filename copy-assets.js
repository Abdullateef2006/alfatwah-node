/**
 * copy-assets.js
 * Run once: node copy-assets.js
 * Copies all static images from the Django project's static/img folder
 * into the Node.js project's public/img folder.
 */
const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '../alfatwa/website/static/img');
const dest = path.resolve(__dirname, 'public/img');

if (!fs.existsSync(dest)) {
  fs.mkdirSync(dest, { recursive: true });
  console.log('Created public/img/');
}

const files = fs.readdirSync(src);
let copied = 0;
for (const file of files) {
  const srcFile = path.join(src, file);
  const destFile = path.join(dest, file);
  fs.copyFileSync(srcFile, destFile);
  console.log(`  Copied: ${file}`);
  copied++;
}
console.log(`\n✅ Done — ${copied} image(s) copied to public/img/`);
