const { __defineGetter__ } = Object.prototype

function setGetter(object, key, getter) {
  __defineGetter__.call(object, key, getter)
  return object
}

export default setGetter
