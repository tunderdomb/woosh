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
