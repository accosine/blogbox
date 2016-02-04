var request = require('superagent');

module.exports.listFolder = function listFolder(token, cb) {
  request
  .post('https://api.dropboxapi.com/2/files/list_folder')
  .accept('application/json')
  .type('application/json')
  .set('Authorization', 'Bearer ' + token)
  .send({ path: '', recursive: true, include_deleted: true })
  .end(cb);
}

module.exports.listFolderContinue = function listFolderContinue(token, cursor, cb) {
  request
  .post('https://api.dropboxapi.com/2/files/list_folder/continue')
  .accept('application/json')
  .type('application/json')
  .set('Authorization', 'Bearer ' + token)
  .send({ cursor: cursor })
  .end(cb);
}

module.exports.requestToken = function requestToken(code, cb) {
  request
  .post('https://api.dropboxapi.com/1/oauth2/token')
  .type('application/x-www-form-urlencoded')
  .accept('application/json')
  .send(
    { code: code,
      grant_type: 'authorization_code',
      client_id: process.env.APP_ID,
      client_secret: process.env.APP_SECRET,
      redirect_uri: 'https://m.ptfo.net/redirect'
  })
  .end(function(err, res) {
    cb(err, res.body.uid, res.body.access_token);
  });
}
