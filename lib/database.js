const redis = require('redis').createClient();

module.exports.getTokenAndCursor = (user, cb) => {
  redis.hget('tokens', user, (errToken, token) => {
    redis.hget('cursors', user, (errCursor, cursor) => {
      cb(token, cursor);
    });
  });
};

module.exports.setToken = (user, token, cb) => {
  redis.hset('tokens', user, token, cb);
};

module.exports.setCursor = (user, cursor, cb) => {
  redis.hset('cursors', user, cursor, cb);
};
