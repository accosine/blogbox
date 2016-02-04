var redis = require('redis').createClient();

module.exports.getTokenAndCursor = function getTokenAndCursor(user, cb) {
  redis.hget('tokens', user, function(errToken, token) {
    redis.hget('cursors', user, function(errCursor, cursor) {
      cb(token, cursor);
    });
  });
}

module.exports.setToken = function setToken(user, token, cb) {
  redis.hset('tokens', user, token, cb);
}

module.exports.setCursor = function setCursor(user, cursor, cb) {
  redis.hset('cursors', user, cursor, cb);
}
