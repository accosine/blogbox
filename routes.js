var async = require('async');
var path = require('path');
var fs = require('fs');

var dropbox = require('./lib/dropbox');
var database = require('./lib/database');
var image = require('./lib/image');

const imageFormats = ['jpg', 'JPG', 'jpeg', 'JPEG', 'png', 'PNG'];
const imageSizes = [
  { longEdge: '200', suffix: 'small'},
  { longEdge: '640', suffix: 'medium'},
  { longEdge: '2000', suffix: 'large'}
];

module.exports = function(app){

  app.get("/", function(req, res) {
    res.sendFile('www/signup.html', { root: __dirname });
  });

  app.get("/redirect", redirect);

  app.get("/webhook", function(req, res) {
    // echo challenge
    res.send(req.query.challenge);
  });

  app.post("/webhook", webhook);

}

function redirect(req, res) {
  // get token for user and save in redis
  dropbox.requestToken(req.query.code, function(err, uid, token) {
    database.setToken(uid, token, function(err) {
      res.sendFile('www/redirect.html', { root: __dirname });
    });
  });
}

function webhook(req, res) {
  res.sendStatus(200);
  var users = req.body.delta.users
  users.forEach(function(user) {
    processUser(user);
  });
}

function processUser(user) {
  // console.log('User:', user);
  database.getTokenAndCursor(user, function(token, cursor) {
    var has_more = true;
    var entries = [];
    async.whilst(
      function() { return has_more},
      function(cb) {
        if (cursor) {
          dropbox.listFolderContinue(token, cursor, function(err, res){
            entries = entries.concat(res.body.entries);
            cursor = res.body.cursor;
            database.setCursor(user, res.body.cursor)
            has_more = res.body.has_more;
            cb(err);
          });
        }
        else {
          dropbox.listFolder(token, function(err, res){
            entries = entries.concat(res.body.entries);
            cursor = res.body.cursor;
            database.setCursor(user, res.body.cursor)
            has_more = res.body.has_more;
            cb(err);
          });
        }
      },
      function(err) {
        processEntries(token, entries);
      }
    );
  });
}

function processEntries(token, entries) {
  entries.forEach(function(entry) {
    console.log(entry);
    if (entry['.tag'] === 'file') {
      console.log(entry.path_lower + ' added or modified.');

      var filename = entry.path_lower.split('/').reverse()[0];
      var extension = filename.split('.').reverse()[0];
      console.log(filename, extension);

      if (extension === 'md') {
        var out = fs.createWriteStream(path.join(process.env.ARTICLE_FOLDER, filename));
        dropbox.downloadFile(token, entry.path_lower).pipe(out);
      }
      // check for MIME-type instead
      else if (imageFormats.indexOf(extension) > -1) {
        var imageStream = dropbox.downloadFile(token, entry.path_lower);
        imageSizes.forEach(function(size) {
          var name = filename.replace(/(\.[^\.]*)?$/, '.' + size.suffix + '$1')
          var out = fs.createWriteStream(path.join(process.env.IMAGE_FOLDER, name));
          image.resize(imageStream, size.longEdge).pipe(out);
        });
      }
      // don't process gifs
      else if (extension === 'gif') {
        var out = fs.createWriteStream(path.join(process.env.IMAGE_FOLDER, filename));
        dropbox.downloadFile(token, entry.path_lower).pipe(out);
      }
    }
    else if (entry['.tag'] === 'deleted') {
      console.log(entry.path_lower + ' deleted.');
    }
  });
}
