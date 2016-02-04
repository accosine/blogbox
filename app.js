if (process.env.NODE_ENV !== 'production') { require('dotenv').config(); }

var createServer = require("auto-sni");
var express      = require("express");
var app          = express();
var bodyParser = require('body-parser');

var settings = {
  email: process.env.EMAIL,
  agreeTos: true,
  debug: true,
  domains: process.env.DOMAIN,
  forceSSL: process.env.SSL_REDIRECT === 'true' ? true : false,
  ports: {
    http: process.env.HTTP_PORT,
    https: process.env.HTTPS_PORT
  }
};

if(process.env.SSL_REDIRECT !== 'true') {
  app.use(function (req, res, next) {
    if (req.protocol === 'http') {
      res.redirect('https://' + process.env.DOMAIN);
    }
    else {
      next();
    }
  });
}
app.use(bodyParser.json({verify:function(req,res,buf){req.rawBody=buf}}))

require('./routes')(app);

createServer(settings, app);
