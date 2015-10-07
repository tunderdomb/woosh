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
