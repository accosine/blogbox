const async = require('async');
const path = require('path');
const fs = require('fs');

const dropbox = require('./lib/dropbox');
const database = require('./lib/database');
const image = require('./lib/image');

const imageFormats = ['jpg', 'JPG', 'jpeg', 'JPEG', 'png', 'PNG'];
const imageSizes = [
  { width: '320', prefix: 's-' },
  { width: '640', prefix: 'm-' },
  { width: '1280', prefix: 'l-' },
];

const processEntries = (token, entries) => {
  entries.forEach((entry) => {
    console.log(entry);
    if (entry['.tag'] === 'file') {
      console.log(`${entry.path_lower} added or modified.`);

      const filename = entry.path_lower.split('/').reverse()[0];
      const extension = filename.split('.').reverse()[0];
      console.log(filename, extension);

      if (extension === 'md') {
        const out = fs.createWriteStream(path.join(process.env.ARTICLE_FOLDER, filename));
        dropbox.downloadFile(token, entry.path_lower).pipe(out);
      } else if (imageFormats.indexOf(extension) > -1) { // TODO: check for MIME-type instead
        const imageStream = dropbox.downloadFile(token, entry.path_lower);
        imageSizes.forEach((size) => {
          // var name = filename.replace(/(\.[^\.]*)?$/, '.' + size.suffix + '$1')
          const name = `${size.prefix}${filename}`;
          const out = fs.createWriteStream(path.join(process.env.IMAGE_FOLDER, name));
          image.resize(imageStream, size.width).pipe(out);
        });
      } else if (extension === 'gif') { // don't process gifs
        const out = fs.createWriteStream(path.join(process.env.IMAGE_FOLDER, filename));
        dropbox.downloadFile(token, entry.path_lower).pipe(out);
      }
    } else if (entry['.tag'] === 'deleted') {
      console.log(`${entry.path_lower} deleted.`);
    }
  });
};

const processUser = (user) => {
  console.log('User:', user);
  database.getTokenAndCursor(user, (token, cursor) => {
    let hasMore = true;
    let entries = [];
    async.whilst(
      () => hasMore,
      (cb) => {
        if (cursor) {
          dropbox.listFolderContinue(token, cursor, (err, res) => {
            if (err) throw err;
            entries = entries.concat(res.body.entries);
            // cursor = res.body.cursor;
            database.setCursor(user, res.body.cursor);
            hasMore = res.body.has_more;
            cb(err);
          });
        } else {
          dropbox.listFolder(token, (err, res) => {
            if (err) throw err;
            entries = entries.concat(res.body.entries);
            // cursor = res.body.cursor;
            database.setCursor(user, res.body.cursor);
            hasMore = res.body.has_more;
            cb(err);
          });
        }
      },
      (err) => {
        if (err) throw err;
        processEntries(token, entries);
      }
    );
  });
};

const redirect = (req, res) => {
  // get token for user and save in redis
  dropbox.requestToken(req.query.code, (errGet, uid, token) => {
    if (errGet) throw errGet;
    database.setToken(uid, token, (errSet) => {
      if (errSet) throw errSet;
      res.sendFile('www/redirect.html', { root: __dirname });
    });
  });
};

const webhook = (req, res) => {
  res.sendStatus(200);
  const users = req.body.delta.users;
  users.forEach((user) => {
    processUser(user);
  });
};

module.exports = (app) => {
  app.get('/', (req, res) => {
    res.sendFile('www/signup.html', { root: __dirname });
  });

  app.get('/redirect', redirect);

  app.get('/webhook', (req, res) => {
    // echo challenge
    res.send(req.query.challenge);
  });

  app.post('/webhook', webhook);
};
