const _keys = Object.keys

function keys(object) {
  return object == null ? [] : _keys(object)
}

export default keys
