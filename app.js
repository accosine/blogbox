if (process.env.NODE_ENV !== 'production') { require('dotenv').config(); }

const createServer = require('auto-sni');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');

const routes = require('./routes');

const settings = {
  email: process.env.EMAIL,
  agreeTos: true,
  debug: true,
  domains: process.env.DOMAIN,
  forceSSL: process.env.SSL_REDIRECT === 'true',
  ports: {
    http: process.env.HTTP_PORT,
    https: process.env.HTTPS_PORT,
  },
};

if (process.env.SSL_REDIRECT !== 'true') {
  app.use((req, res, next) => {
    if (req.protocol === 'http') {
      res.redirect(`https://${process.env.DOMAIN}`);
    } else {
      next();
    }
  });
}

app.use(bodyParser.json({verify:function(req,res,buf){req.rawBody=buf}})) // eslint-disable-line

routes(app);

createServer(settings, app);
