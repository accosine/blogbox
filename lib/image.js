const gm = require('gm');

module.exports.resize = function resize(imageStream, longEdge) {
  imageStream.readable = true;

  return gm(imageStream)
  .resize(longEdge, longEdge, '>')
  .noProfile()
  .stream();
}
