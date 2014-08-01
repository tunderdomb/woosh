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