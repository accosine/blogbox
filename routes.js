var async = require('async');

var dropbox = require('./lib/dropbox');
var database = require('./lib/database');

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
  console.log('User:', user);
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
        processEntries(entries);
      }
    );
  });
}

function processEntries(entries) {
  entries.forEach(function(entry) {
    if (entry['.tag'] === 'file') {
      console.log(entry.path_lower + ' added.');
    }
    else if (entry['.tag'] === 'deleted') {
      console.log(entry.path_lower + ' deleted.');
    }
  });
}

