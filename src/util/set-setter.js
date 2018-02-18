const { __defineSetter__ } = Object.prototype

function setSetter(object, key, setter) {
  __defineSetter__.call(object, key, setter)
  return object
}

export default setSetter
