'use strict';

const async = require('async');
const path = require('path');
const fs = require('fs');

const dropbox = require('./lib/dropbox');
const database = require('./lib/database');
const image = require('./lib/image');

const handleMarkdown = (token, entry, filename) => {
  const out = fs.createWriteStream(path.join(process.env.ARTICLE_FOLDER, filename));
  dropbox.downloadFile(token, entry.path_lower).pipe(out);
};

const handleGif = (token, entry, filename) => {
  // download gif as is
  const out = fs.createWriteStream(path.join(process.env.IMAGE_FOLDER, filename));
  dropbox.downloadFile(token, entry.path_lower).pipe(out);

  // extract first frame as placeholder
  image.gifPlaceholder(token, entry, filename);
};

const handleImage = (token, entry, filename) => {
  image.resize(token, entry, filename);
};

const processEntries = (token, entries) => {
  entries.forEach((entry) => {
    if (entry['.tag'] === 'file') {
      console.log(`\t${entry.path_lower} added or modified.`);

      const filename = entry.path_lower.split('/').reverse()[0].split(' ').join('-');
      const extension = filename.split('.').reverse()[0];

      switch (extension.toLowerCase()) {
        case 'md':
          handleMarkdown(token, entry, filename);
          break;
        case 'jpg':
        case 'jpeg':
        case 'png':
          handleImage(token, entry, filename);
          break;
        case 'gif':
          handleGif(token, entry, filename);
          break;
        default:
          console.log(`\t\t${extension} files are not handled.`);
      }
    } else if (entry['.tag'] === 'deleted') {
      console.log(`\t${entry.path_lower} deleted.`);
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
            database.setCursor(user, res.body.cursor);
            hasMore = res.body.has_more;
            cb(err);
          });
        } else {
          dropbox.listFolder(token, (err, res) => {
            if (err) throw err;
            entries = entries.concat(res.body.entries);
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

module.exports = (app) => {
  app.get('/', (req, res) => {
    res.render('signup', {
      appId: process.env.APP_ID,
      domain: process.env.DOMAIN,
      redirectPath: process.env.REDIRECT_PATH,
    });
  });

  app.get('/redirect', (req, res) => {
    // get token for user and save in redis
    dropbox.requestToken(req.query.code, (errGet, uid, token) => {
      if (errGet) throw errGet;
      database.setToken(uid, token, (errSet) => {
        if (errSet) throw errSet;
        console.log(`${uid} registered.`);
        res.render('redirect');
      });
    });
  });

  app.get('/webhook', (req, res) => {
    // echo challenge
    res.send(req.query.challenge);
  });

  app.post('/webhook', (req, res) => {
    res.sendStatus(200);
    const users = req.body.delta.users;
    users.forEach((user) => {
      processUser(user);
    });
  });
};
