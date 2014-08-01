(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * BezierEasing - use bezier curve for transition easing function
 * is based on Firefox's nsSMILKeySpline.cpp
 * Usage:
 * var spline = BezierEasing(0.25, 0.1, 0.25, 1.0)
 * spline(x) => returns the easing value | x must be in [0, 1] range
 *
 */
(function (definition) {
  if (typeof exports === "object") {
    module.exports = definition();
  }
  else if (typeof window.define === 'function' && window.define.amd) {
    window.define([], definition);
  } else {
    window.BezierEasing = definition();
  }
}(function () {

  // These values are established by empiricism with tests (tradeoff: performance VS precision)
  var NEWTON_ITERATIONS = 4;
  var NEWTON_MIN_SLOPE = 0.001;
  var SUBDIVISION_PRECISION = 0.0000001;
  var SUBDIVISION_MAX_ITERATIONS = 10;

  var kSplineTableSize = 11;
  var kSampleStepSize = 1.0 / (kSplineTableSize - 1.0);

  var float32ArraySupported = typeof Float32Array === "function";

  function BezierEasing (mX1, mY1, mX2, mY2) {
    // Validate arguments
    if (arguments.length !== 4) {
      throw new Error("BezierEasing requires 4 arguments.");
    }
    for (var i=0; i<4; ++i) {
      if (typeof arguments[i] !== "number" || isNaN(arguments[i]) || !isFinite(arguments[i])) {
        throw new Error("BezierEasing arguments should be integers.");
      } 
    }
    if (mX1 < 0 || mX1 > 1 || mX2 < 0 || mX2 > 1) {
      throw new Error("BezierEasing x values must be in [0, 1] range.");
    }

    var mSampleValues = float32ArraySupported ? new Float32Array(kSplineTableSize) : new Array(kSplineTableSize);
   
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

    function newtonRaphsonIterate (aX, aGuessT) {
      for (var i = 0; i < NEWTON_ITERATIONS; ++i) {
        var currentSlope = getSlope(aGuessT, mX1, mX2);
        if (currentSlope === 0.0) return aGuessT;
        var currentX = calcBezier(aGuessT, mX1, mX2) - aX;
        aGuessT -= currentX / currentSlope;
      }
      return aGuessT;
    }

    function calcSampleValues () {
      for (var i = 0; i < kSplineTableSize; ++i) {
        mSampleValues[i] = calcBezier(i * kSampleStepSize, mX1, mX2);
      }
    }

    function binarySubdivide (aX, aA, aB) {
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

    function getTForX (aX) {
      var intervalStart = 0.0;
      var currentSample = 1;
      var lastSample = kSplineTableSize - 1;

      for (; currentSample != lastSample && mSampleValues[currentSample] <= aX; ++currentSample) {
        intervalStart += kSampleStepSize;
      }
      --currentSample;

      // Interpolate to provide an initial guess for t
      var dist = (aX - mSampleValues[currentSample]) / (mSampleValues[currentSample+1] - mSampleValues[currentSample]);
      var guessForT = intervalStart + dist * kSampleStepSize;

      var initialSlope = getSlope(guessForT, mX1, mX2);
      if (initialSlope >= NEWTON_MIN_SLOPE) {
        return newtonRaphsonIterate(aX, guessForT);
      } else if (initialSlope == 0.0) {
        return guessForT;
      } else {
        return binarySubdivide(aX, intervalStart, intervalStart + kSampleStepSize);
      }
    }

    if (mX1 != mY1 || mX2 != mY2)
      calcSampleValues();

    var f = function (aX) {
      if (mX1 === mY1 && mX2 === mY2) return aX; // linear
      // Because JavaScript number are imprecise, we should guarantee the extremes are right.
      if (aX === 0) return 0;
      if (aX === 1) return 1;
      return calcBezier(getTForX(aX), mY1, mY2);
    };
    var str = "BezierEasing("+[mX1, mY1, mX2, mY2]+")";
    f.toString = function () { return str; };

    return f;
  }

  // CSS mapping
  BezierEasing.css = {
    "ease":        BezierEasing(0.25, 0.1, 0.25, 1.0),
    "linear":      BezierEasing(0.00, 0.0, 1.00, 1.0),
    "ease-in":     BezierEasing(0.42, 0.0, 1.00, 1.0),
    "ease-out":    BezierEasing(0.00, 0.0, 0.58, 1.0),
    "ease-in-out": BezierEasing(0.42, 0.0, 0.58, 1.0)
  };

  return BezierEasing;

}));

},{}],2:[function(require,module,exports){
var BezierEasing = require("../node_modules/bezier-easing")
var EASINGS = require("./easing")

module.exports = Animation

function Animation( tween ){
  if ( tween ) this.tween(tween)
  this.channels = {}
}

Animation.prototype = {
  duration: 0,
  startTime: 0,
  loop: false,
  isRunning: false,
  delay: 0,
  context: null,
  easing: BezierEasing(0, 0, 1, 1),
  ease: function ( mX1, mY1, mX2, mY2 ){
    if ( EASINGS[mX1] ) {
      this.easing = EASINGS[mX1]
    }
    else if ( typeof mX1 == "function" ) {
      this.easing = mX1
    }
    else if ( arguments.length = 4 ) {
      this.easing = BezierEasing(mX1, mY1, mX2, mY2)
    }
    return this
  },
  tween: function ( tween ){
    this.duration = tween.duration || this.duration
    this.delay = tween.delay || this.delay
    if ( tween.loop != undefined ) this.loop = tween.loop
    if ( tween.ease ) this.ease.apply(this, tween.ease)
    this.context = tween.context || null
    return this
  },
  start: function ( render ){
    var startTime
      , duration = this.duration
      , ease = this.easing
      , animation = this
      , context = this.context || animation
      , loop = this.loop

    if ( !duration ) return this

    this.isRunning = true

    var ended = false

    // animation logic
    var startAnimation = function (){
      startTime = Date.now()
      // animation loop
      !function looper(){
        // when the loop count is numeric
        // the normal run can request one additional frame
        // before quiting, causing the last step to be called twice
        if ( ended ) return
        var p = (Date.now() - startTime) / duration

        // last step
        if ( p > 1 ) {
          render.call(context, 1)
          if ( !loop ) {
            animation.trigger("end")
            ended = true
          }
        }
        // normal run
        else if ( animation.isRunning ) {
          requestAnimationFrame(looper, null)
          render.call(context, ease(p))
        }
        // when .stop() called
        else {
          render.call(context, ease(p))
          clearInterval(timerID)
          animation.trigger("end")
          ended = true
        }
      }()
    }

    // delay start
    var timerID
    setTimeout(function (){
      animation.trigger("start")
      if ( loop ) {
        startAnimation()
        animation.trigger("cycle", /*animation, */animation.loop - loop)
        if ( typeof loop == "boolean" ) {
          // infinite loop
          timerID = setInterval(function (){
            startAnimation()
            animation.trigger("cycle", /*animation, */animation.loop - loop)
          }, duration)
        }
        else if( typeof loop == "number" ) {
          // counter loop
          timerID = setInterval(function (){
            if ( !--loop ) clearInterval(timerID)
            else {
              startAnimation()
              animation.trigger("cycle", /*animation, */animation.loop - loop)
            }
          }, duration)
        }
      }
      else {
        // no loop
        startAnimation()
      }
    }, this.delay)
    return this
  },
  stop: function (){
    this.isRunning = false
    this.startTime = 0
    this.trigger("stop")
    return this
  },
  listen: function ( channel, callback ){
    this.channels[channel] = this.channels[channel] || []
    this.channels[channel].push(callback)
    return this
  },
  unlisten: function ( channel, callback ){
    channel = this.channels[channel]
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
    channel = this.channels[channel]
    if ( !channel ) return this
    var i = -1
      , l = channel.length
    msg = [].slice.call(arguments, 1)
    while ( ++i < l ) {
      channel[i].apply(this.context, msg)
    }
    return this
  }
}

Animation.prototype.on = Animation.prototype.listen
Animation.prototype.off = Animation.prototype.removeListener = Animation.prototype.unlisten
},{"../node_modules/bezier-easing":1,"./easing":3}],3:[function(require,module,exports){
var BezierEasing = require("../node_modules/bezier-easing")

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
},{"../node_modules/bezier-easing":1}],4:[function(require,module,exports){
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
    Animation.prototype[method] = extension[method]
  }
}
woosh.easing = function ( extension ){
  for ( var name in extension ) {
    EASINGS[name] = extension[name]
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
    var value = parseInt(subject instanceof Element
      ? getStyle(subject, property)
      : subject[property])
    // assume 0 for unset or non-numeric values
    return isNaN(value) ? 0 : value
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
    return function ( p ){
      var value = getValue(subject, property)
      if ( value <= max ) {
//        console.log("startValue %d, max %d, delta %d, p %f, p*delta %f", startValue, max, delta, p, p*delta)
        p = startValue + (p *= delta) >= max ? max : startValue + p
//        setValue(subject, property, p, post)
//        return true
        return [subject, property, p, post]
      }
      else if ( animation.loop ) {
//        setValue(subject, property, startValue, post)
//        return true
        return [subject, property, startValue, post]
      }
      return false
    }
  }

  function decrement( animation, subject, property, min, post ){
    var startValue = getValue(subject, property)
      , delta = startValue - min
    return function ( p ){
      var value = getValue(subject, property)
      if ( value >= min ) {
        p = startValue - delta * p
        p = p <= min ? min : p
//        setValue(subject, property, p, post)
//        return true
        return [subject, property, p, post]
      }
      else if ( animation.loop ) {
//        setValue(subject, property, startValue, post)
//        return true
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
      valFrom = getValue(subject, p)
      valTo = getValue(to, p)
      post = postfix(subject, p) || postfix(to, p)
      ++length
      if ( valFrom < valTo ) values[p] = increment(animation, subject, p, valTo, post)
      else if ( valFrom > valTo ) values[p] = decrement(animation, subject, p, valTo, post)
      else --length
    }
    to = subject = null
    return function ( p ){
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