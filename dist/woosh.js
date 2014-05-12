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

(function ( def ){
  if ( typeof exports === "object" ) {
    module.exports = def()
  }
  else if ( typeof window.define === 'function' && window.define.amd ) {
    window.define([], def)
  } else {
    window.woosh = def()
  }
}(function (){

  function Animation( tween ){
    if ( tween ) this.tween(tween)
    this.channels = {}
  }
  Animation.prototype = {
    duration: 0,
    startTime: 0,
    loop: false,
    isRunning: false,
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
      this.duration = tween.duration
      this.loop = !!tween.loop
      if ( tween.ease ) this.ease.apply(this, tween.ease)
      return this
    },
    start: function ( render ){
      var start
        , duration = this.duration
        , ease = this.easing
        , animation = this

      if ( !duration ) return this

      this.isRunning = true
      this.trigger("start")

      var animate = function(  ){
        start = Date.now()
        !function loop(){
          var p = (Date.now() - start) / duration
          if ( p > 1 ) {
            render(1)
            if( !animation.loop ) animation.trigger("end")
          }
          else if ( animation.isRunning ) {
            requestAnimationFrame(loop, null)
            render(ease(p))
          }
          else {
            render(ease(p))
            animation.trigger("end")
          }
        }()
      }

      if ( this.loop ) {
        animate()
        setInterval(animate, duration)
      }
      else {
        animate()
      }
      return this
    },
    stop: function (){
      this.isRunning = false
      this.startTime = 0
      this.trigger("stop")
      this.trigger("end")
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
    trigger: function ( channel ){
      channel = this.channels[channel]
      if ( !channel ) return this
      var i = -1
        , l = channel.length
      while ( ++i < l ) {
        channel[i](this)
      }
      return this
    }
  }

  var EASINGS = {
    "ease": BezierEasing(0.25, 0.1, 0.25, 1.0),
    "linear": BezierEasing(0.00, 0.0, 1.00, 1.0),
    "ease-in": BezierEasing(0.42, 0.0, 1.00, 1.0),
    "ease-out": BezierEasing(0.00, 0.0, 0.58, 1.0),
    "ease-in-out": BezierEasing(0.42, 0.0, 0.58, 1.0),
    /*!
     * Equations are adapted from Thomas Fuchs' [Scripty2](https://github.com/madrobby/scripty2/blob/master/src/effects/transitions/penner.js).
     * Based on Easing Equations (c) 2003 [Robert Penner](http://www.robertpenner.com/), all rights reserved. This work is [subject to terms](http://www.robertpenner.com/easing_terms_of_use.html).
     * TERMS OF USE - EASING EQUATIONS
     *  Open source under the BSD License.
     *  Easing Equations (c) 2003 Robert Penner, all rights reserved.
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

  function woosh( tween ){
    return new Animation(tween)
  }
  woosh.Animation = Animation

  return woosh

}));