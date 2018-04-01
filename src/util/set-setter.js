const { __defineSetter__ } = Object.prototype

function setSetter(object, name, setter) {
  __defineSetter__.call(object, name, setter)
  return object
}

export default setSetter
