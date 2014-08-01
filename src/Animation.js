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
    if ( tween.ease ) {
      if ( EASINGS[tween.ease] ) {
        this.easing = EASINGS[tween.ease]
      }
      else if ( typeof tween.ease == "function" ) {
        this.easing = tween.ease
      }
      else this.ease.apply(this, tween.ease)
    }
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