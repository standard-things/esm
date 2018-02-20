function keys(object) {
  return object == null
    ? []
    : Object.keys(object)
}

export default keys
