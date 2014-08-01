woosh
=====

Tiny tweening library

Tiny, because it's heavily based on [gre/bezier-easing](https://github.com/gre/bezier-easing).
What woosh does is provide a controller with which you can instantiate animation objects and start the animation.
Not much magic, bot does the job with minimal code.

## Usage

### Event examples

```js
var canvas = document.getElementById("viewport")
  , ctx = canvas.getContext("2d")

var animation = woosh({
  delay: 3000,
  duration: 2000,
  loop: true,
  ease: [0.25, 0.1, 0.0, 1.0]
})
  .listen("start", function (){
    console.log("Hey ho, let's go!")
  })
  .listen("stop", function (){
    console.log("Halted!")
  })
  .listen("end", function (){
    console.log("Done!")
  })
  .start(function moveRectangle( p ){ // p move from 0 to 1
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = "hsl(" + Math.round(255 * p) + ",80%,50%)"
    var w = 50
    var h = 50 + p * (canvas.height - 50)
    ctx.fillRect((canvas.width - w) * p, (canvas.height - h) * 0.5, w, h)
  })
```

### Property animation

```js
var box = document.getElementById("box")
  , box2 = document.getElementById("box2")

var propertyAnimation = woosh({
  duration: 2000,
  loop: 10,
  ease: [0.25, 0.1, 0.0, 1.0],
  context: box
})
  .to(box, {
    left: "500px",
    top: "100px"
  })
  .listen("cycle", function( cycleCount ){
    this.textContent = 10-cycleCount
  })

var propertyAnimation2 = woosh({
  duration: 2000,
  loop: true,
  ease: [0.25, 0.1, 0.0, 1.0],
  context: box2
})
  .to(box2, {
    left: 0,
    top: -100
  })
```

## (tiny) API

### Methods

#### .ease ( String easingAlias )

Set the easing with an easing alias. See them down below.

#### .ease ( Function customEasingFunction )

Define a custom easing function.

##### customEasingFunction( Number p ){ return p }

This function receives the current animation progress and should return a modified value for it.

#### .ease ( Number mX1, Number mY1, Number mX2, Number mY2 )

These numbers will be passed to [`BezierEasing`](https://github.com/gre/bezier-easing).
They are the css equivalent of a bezier easing function's arguments.

#### .tween (Object options)

Set multiple options regarding the tween.

##### options.duration [optional] Number default: 0

The duration of the animation.

##### options.delay [optional] Number default: 0

Delays the animation in milliseconds.

##### options.loop [optional] Boolean|Number default: false

A boolean true indicates an infinite loop.
A number indicates how many times the animation should loop.

##### options.ease [optional] see `.ease(...)` arguments

Sets the easing function for the animation.

##### options.context [optional] Any default: the animation object

A context the rendering function (passed to `.start(Function render)`) will be called with.

#### .start (Function render)

Kick off the animation, and use the provided rendering function to do stuff.

##### function render( Number p ){ return p }

The rendering function receives one parameter which travels from 0 to 1.
From the start of the animation to the end it indicates the progress.

#### .stop()

Stops the animation.
Starting again will start from all over again.

#### .to( Any subject, Object to)

Property animation.
In this case `.start()` is called automatically.

`subject` is the host on properties will be modified.
`to` is a hash of end values.

#### .listen | on (String channel, Function callback)

Register a callback for an event.

#### .unlisten | off | removeListener (String channel, Function callback)

Unregister a listener from an event.

#### .once (String channel, Function callback)

Listen to an event only once.

### Events

#### "start", function(){}

Triggered right before the first animation loop.

#### "stop", function(){}

Triggered when `.stop()` is called.

#### "end", function(){}

Triggered right after the last render happened.

#### "cycle", function(Animation animation, Number currentCycleCount){}

Triggered on each cycle if the animation is looping.


## Easings

### Bezier shortcuts

- "ease"
- "linear"
- "ease-in"
- "ease-out"
- "elastic"

### Easing functions

Equations are adapted from Thomas Fuchs' [Scripty2](https://github.com/madrobby/scripty2/blob/master/src/effects/transitions/penner.js).
Based on Easing Equations (c) 2003 [Robert Penner](http://www.robertpenner.com/), all rights reserved. This work is [subject to terms](http://www.robertpenner.com/easing_terms_of_use.html).
TERMS OF USE - EASING EQUATIONS
Open source under the BSD License.
Easing Equations (c) 2003 Robert Penner, all rights reserved.

- "swingFromTo"
- "swingFrom"
- "swingTo"
- "bounce"
- "bouncePast"