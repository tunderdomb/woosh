require("./requestAnimationFrame")

var Animation = require("./Animation")
var EASINGS = require("./easing")

module.exports = global.woosh = woosh

function woosh( tween ){
  return new Animation(tween)
}

woosh.Animation = Animation

woosh.extend = function ( extension ){
  for ( var method in extension ) {
    if (extension.hasOwnProperty(method)) Animation.prototype[method] = extension[method]
  }
}

woosh.easing = function ( extension ){
  for ( var name in extension ) {
    if (extension.hasOwnProperty(name)) EASINGS[name] = extension[name]
  }
}

require("./propertyAnimation")(woosh)
