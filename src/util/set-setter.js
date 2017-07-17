const defineSetter = Object.prototype.__defineSetter__

function setSetter(object, key, setter) {
  defineSetter.call(object, key, setter)
  return object
}

export default setSetter
