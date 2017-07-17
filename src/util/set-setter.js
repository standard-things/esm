const defineSetter = Object.prototype.__defineSetter__

export default function setSetter(object, key, setter) {
  defineSetter.call(object, key, setter)
  return object
}
