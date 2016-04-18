const request = require('superagent');

module.exports.listFolder = (token, cb) => {
  request
  .post('https://api.dropboxapi.com/2/files/list_folder')
  .accept('application/json')
  .type('application/json')
  .set('Authorization', `Bearer ${token}`)
  .send({ path: '', recursive: true, include_deleted: true })
  .end(cb);
};

module.exports.listFolderContinue = (token, cursor, cb) => {
  request
  .post('https://api.dropboxapi.com/2/files/list_folder/continue')
  .accept('application/json')
  .type('application/json')
  .set('Authorization', `Bearer ${token}`)
  .send({ cursor })
  .end(cb);
};

module.exports.requestToken = (code, cb) => {
  request
  .post('https://api.dropboxapi.com/1/oauth2/token')
  .type('application/x-www-form-urlencoded')
  .accept('application/json')
  .send(
    { code,
      grant_type: 'authorization_code',
      client_id: process.env.APP_ID,
      client_secret: process.env.APP_SECRET,
      redirect_uri: 'https://api.nausika.de/redirect',
  })
  .end((err, res) => {
    cb(err, res.body.uid, res.body.access_token);
  });
};

module.exports.downloadFile = (token, path) =>
  request.get('https://content.dropboxapi.com/2/files/download')
    .set('Dropbox-API-Arg', JSON.stringify({ path }))
    .set('Authorization', `Bearer ${token}`)
    .set('Content-Type', '');
