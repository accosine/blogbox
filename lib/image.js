'use strict';

const path = require('path');
const gm = require('gm');
const async = require('async');
const dropbox = require('./dropbox');

const imageSizes = [
  { width: 1280, prefix: 'l-' },
  { width: 640, prefix: 'm-' },
  { width: 320, prefix: 's-' },
];

const q = async.queue((task, cb) => {
  task.stream.readable = true; // eslint-disable-line no-param-reassign
  gm(task.stream).resize(task.width, null, '>').write(task.path, cb);
}, process.env.IMAGE_RESIZE_CONCURRENCY);

q.drain = () => { console.log('Image resizing queue empty.'); };

module.exports.resize = (token, entry, filename) => {
  imageSizes.forEach((size) => {
    // TODO: don't download image for each size, buffer?
    const stream = dropbox.downloadFile(token, entry.path_lower);
    const name = `${size.prefix}${filename}`;
    const filePath = path.join(process.env.IMAGE_FOLDER, name);
    q.push({ stream, width: size.width, path: filePath }, (err) => {
      if (err) throw err;
      console.log(`resized ${filename} to ${size.width}px width`);
    });
  });
};
