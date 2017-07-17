const defineGetter = Object.prototype.__defineGetter__

export default function setGetter(object, key, getter) {
  defineGetter.call(object, key, getter)
  return object
}
