(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
/**
 * BezierEasing - use bezier curve for transition easing function
 * by Gaëtan Renaudeau 2014 - 2015 – MIT License
 *
 * Credits: is based on Firefox's nsSMILKeySpline.cpp
 * Usage:
 * var spline = BezierEasing([ 0.25, 0.1, 0.25, 1.0 ])
 * spline.get(x) => returns the easing value | x must be in [0, 1] range
 *
 */

// These values are established by empiricism with tests (tradeoff: performance VS precision)
var NEWTON_ITERATIONS = 4;
var NEWTON_MIN_SLOPE = 0.001;
var SUBDIVISION_PRECISION = 0.0000001;
var SUBDIVISION_MAX_ITERATIONS = 10;

var kSplineTableSize = 11;
var kSampleStepSize = 1.0 / (kSplineTableSize - 1.0);

var float32ArraySupported = 'Float32Array' in global;

function A (aA1, aA2) { return 1.0 - 3.0 * aA2 + 3.0 * aA1; }
function B (aA1, aA2) { return 3.0 * aA2 - 6.0 * aA1; }
function C (aA1)      { return 3.0 * aA1; }

// Returns x(t) given t, x1, and x2, or y(t) given t, y1, and y2.
function calcBezier (aT, aA1, aA2) {
  return ((A(aA1, aA2)*aT + B(aA1, aA2))*aT + C(aA1))*aT;
}

// Returns dx/dt given t, x1, and x2, or dy/dt given t, y1, and y2.
function getSlope (aT, aA1, aA2) {
  return 3.0 * A(aA1, aA2)*aT*aT + 2.0 * B(aA1, aA2) * aT + C(aA1);
}

function binarySubdivide (aX, aA, aB, mX1, mX2) {
  var currentX, currentT, i = 0;
  do {
    currentT = aA + (aB - aA) / 2.0;
    currentX = calcBezier(currentT, mX1, mX2) - aX;
    if (currentX > 0.0) {
      aB = currentT;
    } else {
      aA = currentT;
    }
  } while (Math.abs(currentX) > SUBDIVISION_PRECISION && ++i < SUBDIVISION_MAX_ITERATIONS);
  return currentT;
}

function newtonRaphsonIterate (aX, aGuessT, mX1, mX2) {
  for (var i = 0; i < NEWTON_ITERATIONS; ++i) {
    var currentSlope = getSlope(aGuessT, mX1, mX2);
    if (currentSlope === 0.0) return aGuessT;
    var currentX = calcBezier(aGuessT, mX1, mX2) - aX;
    aGuessT -= currentX / currentSlope;
  }
  return aGuessT;
}

/**
 * points is an array of [ mX1, mY1, mX2, mY2 ]
 */
function BezierEasing (points, b, c, d) {
  if (arguments.length === 4) {
    return new BezierEasing([ points, b, c, d ]);
  }
  if (!(this instanceof BezierEasing)) return new BezierEasing(points);

  if (!points || points.length !== 4) {
    throw new Error("BezierEasing: points must contains 4 values");
  }
  for (var i=0; i<4; ++i) {
    if (typeof points[i] !== "number" || isNaN(points[i]) || !isFinite(points[i])) {
      throw new Error("BezierEasing: points should be integers.");
    }
  }
  if (points[0] < 0 || points[0] > 1 || points[2] < 0 || points[2] > 1) {
    throw new Error("BezierEasing x values must be in [0, 1] range.");
  }

  this._str = "BezierEasing("+points+")";
  this._css = "cubic-bezier("+points+")";
  this._p = points;
  this._mSampleValues = float32ArraySupported ? new Float32Array(kSplineTableSize) : new Array(kSplineTableSize);
  this._precomputed = false;
}

BezierEasing.prototype = {

  get: function (x) {
    var mX1 = this._p[0],
      mY1 = this._p[1],
      mX2 = this._p[2],
      mY2 = this._p[3];
    if (!this._precomputed) this._precompute();
    if (mX1 === mY1 && mX2 === mY2) return x; // linear
    // Because JavaScript number are imprecise, we should guarantee the extremes are right.
    if (x === 0) return 0;
    if (x === 1) return 1;
    return calcBezier(this._getTForX(x), mY1, mY2);
  },

  getPoints: function() {
    return this._p;
  },

  toString: function () {
    return this._str;
  },

  toCSS: function () {
    return this._css;
  },

  // Private part

  _precompute: function () {
    var mX1 = this._p[0],
      mY1 = this._p[1],
      mX2 = this._p[2],
      mY2 = this._p[3];
    this._precomputed = true;
    if (mX1 !== mY1 || mX2 !== mY2)
      this._calcSampleValues();
  },

  _calcSampleValues: function () {
    var mX1 = this._p[0],
      mX2 = this._p[2];
    for (var i = 0; i < kSplineTableSize; ++i) {
      this._mSampleValues[i] = calcBezier(i * kSampleStepSize, mX1, mX2);
    }
  },

  /**
   * getTForX chose the fastest heuristic to determine the percentage value precisely from a given X projection.
   */
  _getTForX: function (aX) {
    var mX1 = this._p[0],
      mX2 = this._p[2],
      mSampleValues = this._mSampleValues;

    var intervalStart = 0.0;
    var currentSample = 1;
    var lastSample = kSplineTableSize - 1;

    for (; currentSample !== lastSample && mSampleValues[currentSample] <= aX; ++currentSample) {
      intervalStart += kSampleStepSize;
    }
    --currentSample;

    // Interpolate to provide an initial guess for t
    var dist = (aX - mSampleValues[currentSample]) / (mSampleValues[currentSample+1] - mSampleValues[currentSample]);
    var guessForT = intervalStart + dist * kSampleStepSize;

    var initialSlope = getSlope(guessForT, mX1, mX2);
    if (initialSlope >= NEWTON_MIN_SLOPE) {
      return newtonRaphsonIterate(aX, guessForT, mX1, mX2);
    } else if (initialSlope === 0.0) {
      return guessForT;
    } else {
      return binarySubdivide(aX, intervalStart, intervalStart + kSampleStepSize, mX1, mX2);
    }
  }
};

// CSS mapping
BezierEasing.css = {
  "ease":        BezierEasing.ease      = BezierEasing(0.25, 0.1, 0.25, 1.0),
  "linear":      BezierEasing.linear    = BezierEasing(0.00, 0.0, 1.00, 1.0),
  "ease-in":     BezierEasing.easeIn    = BezierEasing(0.42, 0.0, 1.00, 1.0),
  "ease-out":    BezierEasing.easeOut   = BezierEasing(0.00, 0.0, 0.58, 1.0),
  "ease-in-out": BezierEasing.easeInOut = BezierEasing(0.42, 0.0, 0.58, 1.0)
};

module.exports = BezierEasing;

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],2:[function(require,module,exports){
var BezierEasing = require("bezier-easing")
var EASINGS = require("./easing")

module.exports = Animation

function Animation( tween ){
  // properties
  this.duration = 0
  this.loop = 1
  this.delay = 0
  this.easing = BezierEasing(0, 0, 1, 1)

  // user land
  this.context = null
  this.render = null

  if ( tween ) this.tween(tween)

  // state
  this.isRunning = false
  this.finished = true

  // internals
  this._channels = {}

  var animation = this

  // animation values
  this._loopCount = animation.loop
  this._startTime = 0

  this._cycle = function () {
    animation._animate()
    animation.trigger("cycle", animation.loop - animation._loopCount)
  }

  this._animate = function () {
    animation._startTime = Date.now()

    // animation loop
    !function looper(){
      // when the loop count is numeric
      // the normal run can request one additional frame
      // before quiting, causing the last step to be called twice
      if ( animation.finshed ) return

      var p = (Date.now() - animation._startTime) / animation.duration

      // last step
      if ( p > 1 ) {
        animation.render.call(animation.context||animation, 1)
        if ( !--animation._loopCount ) {
          animation.trigger("end")
          animation.finshed = true
        }
        else {
          animation._cycle()
        }
      }
      // normal run
      else if ( animation.isRunning ) {
        requestAnimationFrame(looper, null)
        animation.render.call(animation.context||animation, animation.easing(p))
      }
      // when .stop() called
      else {
        animation.render.call(animation.context||animation, animation.easing(p))
      }
    }()
  }
}

Animation.prototype = {
  ease: function ( mX1, mY1, mX2, mY2 ){
    if ( EASINGS[mX1] ) {
      this.easing = EASINGS[mX1]
    }
    else if ( typeof mX1 == "function" ) {
      this.easing = mX1
    }
    else if ( arguments.length = 4 ) {
      var easing = BezierEasing(mX1, mY1, mX2, mY2)
      this.easing = function (p) {
        return easing.get(p)
      }
    }
    return this
  },
  tween: function ( tween ){
    this.duration = tween.duration || this.duration
    this.delay = tween.delay || this.delay
    if ( tween.loop != undefined ) {
      if ( typeof tween.loop == "boolean" ) {
        this.loop = tween.loop ? Infinity : 1
      }
      else if (typeof tween.loop == "number") {
        this.loop = Math.abs(tween.loop)
      }
    }
    if ( tween.ease ) {
      if ( EASINGS[tween.ease] ) {
        this.easing = EASINGS[tween.ease]
      }
      else if ( typeof tween.ease == "function" ) {
        this.easing = tween.ease
      }
      else {
        this.ease.apply(this, tween.ease)
      }
    }
    this.context = tween.context || null
    return this
  },
  start: function (render) {
    var animation = this

    animation.render = animation.render || render

    if (!animation.duration || !animation.render || animation.isRunning) {
      return animation
    }

    animation.isRunning = true

    // continue after a stop() call
    if (!animation.finished) {
      animation._animate()
      return animation
    }

    // start from a finished state
    animation._loopCount = animation.loop
    animation.finished = false

    // delay start
    setTimeout(function (){
      animation.trigger("start")
      if ( animation.loop ) {
        animation._cycle()
      }
      else {
        // no loop
        animation._animate()
      }
    }, animation.delay)

    return animation
  },
  stop: function (){
    this.isRunning = false
    this.trigger("stop")
    return this
  },
  end: function () {
    this.isRunning = false
    this._startTime = 0
    this.finished = true
    this._loopCount = this.loop
    this.trigger("end")
    return this
  },
  listen: function ( channel, callback ){
    this._channels[channel] = this._channels[channel] || []
    this._channels[channel].push(callback)
    return this
  },
  unlisten: function ( channel, callback ){
    channel = this._channels[channel]
    if ( !channel || !~channel.indexOf(callback) ) return this
    channel.splice(channel.indexOf(callback), 1)
    return this
  },
  once: function ( channel, callback ){
    var animation = this
    animation.listen(channel, function once(){
      callback.apply(this, arguments)
      animation.unlisten(channel, once)
    })
  },
  trigger: function ( channel, msg ){
    channel = this._channels[channel]
    if ( !channel ) return this
    var i = -1
      , l = channel.length
    msg = [].slice.call(arguments, 1)
    while ( ++i < l ) {
      channel[i].apply(this.context||this, msg)
    }
    return this
  }
}

Animation.prototype.on = Animation.prototype.listen
Animation.prototype.off = Animation.prototype.removeListener = Animation.prototype.unlisten

},{"./easing":3,"bezier-easing":1}],3:[function(require,module,exports){
var BezierEasing = require("bezier-easing")

module.exports = {
  "ease": BezierEasing(0.25, 0.1, 0.25, 1.0),
  "linear": BezierEasing(0.00, 0.0, 1.00, 1.0),
  "ease-in": BezierEasing(0.42, 0.0, 1.00, 1.0),
  "ease-out": BezierEasing(0.00, 0.0, 0.58, 1.0),
  "ease-in-out": BezierEasing(0.42, 0.0, 0.58, 1.0),
  /** @license
   * Equations are adapted from Thomas Fuchs' [Scripty2](https://github.com/madrobby/scripty2/blob/master/src/effects/transitions/penner.js).
   * Based on Easing Equations (c) 2003 [Robert Penner](http://www.robertpenner.com/), all rights reserved. This work is [subject to terms](http://www.robertpenner.com/easing_terms_of_use.html).
   * TERMS OF USE - EASING EQUATIONS
   * Open source under the BSD License.
   * Easing Equations (c) 2003 Robert Penner, all rights reserved.
   * */
  elastic: function ( p ){
    return -1 * Math.pow(4, -8 * p) * Math.sin((p * 6 - 1) * (2 * Math.PI) / 2) + 1;
  },
  swingFromTo: function ( p ){
    var s = 1.70158;
    return ((p /= 0.5) < 1) ? 0.5 * (p * p * (((s *= (1.525)) + 1) * p - s)) :
      0.5 * ((p -= 2) * p * (((s *= (1.525)) + 1) * p + s) + 2);
  },
  swingFrom: function ( p ){
    var s = 1.70158;
    return p * p * ((s + 1) * p - s);
  },
  swingTo: function ( p ){
    var s = 1.70158;
    return (p -= 1) * p * ((s + 1) * p + s) + 1;
  },
  bounce: function ( p ){
    if ( p < (1 / 2.75) ) {
      return (7.5625 * p * p);
    } else if ( p < (2 / 2.75) ) {
      return (7.5625 * (p -= (1.5 / 2.75)) * p + 0.75);
    } else if ( p < (2.5 / 2.75) ) {
      return (7.5625 * (p -= (2.25 / 2.75)) * p + 0.9375);
    } else {
      return (7.5625 * (p -= (2.625 / 2.75)) * p + 0.984375);
    }
  },
  bouncePast: function ( p ){
    if ( p < (1 / 2.75) ) {
      return (7.5625 * p * p);
    } else if ( p < (2 / 2.75) ) {
      return 2 - (7.5625 * (p -= (1.5 / 2.75)) * p + 0.75);
    } else if ( p < (2.5 / 2.75) ) {
      return 2 - (7.5625 * (p -= (2.25 / 2.75)) * p + 0.9375);
    } else {
      return 2 - (7.5625 * (p -= (2.625 / 2.75)) * p + 0.984375);
    }
  }
}

},{"bezier-easing":1}],4:[function(require,module,exports){
(function (global){
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

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./Animation":2,"./easing":3,"./propertyAnimation":5,"./requestAnimationFrame":6}],5:[function(require,module,exports){
module.exports = function ( woosh ){
  function getStyle( el, prop ){
    var value = ""
    if ( window.getComputedStyle ) {
      value = getComputedStyle(el).getPropertyValue(prop)
    }
    else if ( el.currentStyle ) {
      try {
        value = el.currentStyle[prop]
      }
      catch ( e ) {}
    }
    return value
  }

  function getValue( subject, property ){
    var value
    if( property in subject ){
      value = parseInt(subject[property])
    }
    else if ( subject instanceof Element ) {
      value = parseInt(getStyle(subject, property))
    }
    // assume 0 for unset or non-numeric values
    return isNaN(value) || value == undefined ? 0 : value
  }

  function setValue( subject, property, val, post ){
    if ( subject instanceof Element ) {
      if ( subject.style[property] != undefined ) {
        subject = subject.style
      }
    }
    subject[property] = post ? val + post : val
  }

  function postfix( subject, property ){
    var value = subject instanceof Element
      ? getStyle(subject, property)
      : subject[property]
    if ( typeof value == "string" ) {
      var match = value.match(/(px|em|%)$/i)
      return match && match[1]
    }
    return ""
  }

  function increment( animation, subject, property, max, post ){
    var startValue = getValue(subject, property)
      , delta = max - startValue

    return function render( p ){
      var value = getValue(subject, property)
      if ( value <= max ) {
        p = startValue + (p *= delta) >= max ? max : startValue + p
        return [subject, property, p, post]
      }
      else if ( animation.loop ) {
        return [subject, property, startValue, post]
      }
      return false
    }
  }

  function decrement( animation, subject, property, min, post ){
    var startValue = getValue(subject, property)
      , delta = startValue - min
    return function render( p ){
      var value = getValue(subject, property)
      if ( value >= min ) {
        p = startValue - delta * p
        p = p <= min ? min : p
        return [subject, property, p, post]
      }
      else if ( animation.loop ) {
        return [subject, property, startValue, post]
      }
      return false
    }
  }

  function orient( animation, subject, to ){
    var length = 0
      , values = {}
      , valFrom
      , valTo
      , post

    for ( var p in to ) {
      if (to.hasOwnProperty(p)) {
        valFrom = getValue(subject, p)
        valTo = getValue(to, p)
        post = postfix(subject, p) || postfix(to, p)
        ++length
        if ( valFrom < valTo )
          values[p] = increment(animation, subject, p, valTo, post)
        else if ( valFrom > valTo )
          values[p] = decrement(animation, subject, p, valTo, post)
        else
          --length
      }
    }

    to = subject = null

    return function render( p ){
      if ( length ) {
        var setters = []
          , setter

        for ( var f in values ) {
          if ( values.hasOwnProperty(f) ) {
            setter = values[f](p)
            if ( !setter && !animation.loop ) {
              --length
              delete values[f]
            }
            else {
              setters.push(setter)
            }
          }
        }

        var i = -1
          , l = setters.length
        if ( l ) while ( ++i < l ) {
          setValue.apply(null, setters[i])
        }
      }
      else {
        animation.stop()
        animation.trigger("end")
      }
    }
  }

  woosh.extend({
    to: function ( subject, to ){
      return this.start(orient(this, subject, to))
    }
  })

}

},{}],6:[function(require,module,exports){
'use strict';

/** @license
* Adapted from https://gist.github.com/paulirish/1579671 which derived from
* http://paulirish.com/2011/requestanimationframe-for-smart-animating/
* http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
* requestAnimationFrame polyfill by Erik Möller.
* Fixes from Paul Irish, Tino Zijdel, Andrew Mao, Klemen Slavič, Darius Bacon
* MIT license
* */

if (!Date.now)
  Date.now = function() { return new Date().getTime(); };

(function() {
  var vendors = ['webkit', 'moz'];
  for (var i = 0; i < vendors.length && !window.requestAnimationFrame; ++i) {
    var vp = vendors[i];
    window.requestAnimationFrame = window[vp+'RequestAnimationFrame'];
    window.cancelAnimationFrame = (window[vp+'CancelAnimationFrame']
      || window[vp+'CancelRequestAnimationFrame']);
  }
  if (/iP(ad|hone|od).*OS 6/.test(window.navigator.userAgent) // iOS6 is buggy
    || !window.requestAnimationFrame || !window.cancelAnimationFrame) {
    var lastTime = 0;
    window.requestAnimationFrame = function(callback) {
      var now = Date.now();
      var nextTime = Math.max(lastTime + 16, now);
      return setTimeout(function() { callback(lastTime = nextTime); },
        nextTime - now);
    };
    window.cancelAnimationFrame = clearTimeout;
  }
}());
},{}]},{},[4])