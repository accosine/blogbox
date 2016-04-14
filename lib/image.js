const gm = require('gm');

module.exports.resize = (imageStream, longEdge) => {
  imageStream.readable = true; // eslint-disable-line no-param-reassign

  return gm(imageStream)
    .resize(longEdge)
    .noProfile()
    .stream();
};
