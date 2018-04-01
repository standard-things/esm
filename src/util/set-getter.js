const { __defineGetter__ } = Object.prototype

function setGetter(object, name, getter) {
  __defineGetter__.call(object, name, getter)
  return object
}

export default setGetter
