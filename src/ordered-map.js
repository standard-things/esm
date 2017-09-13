import NullObject from "./null-object.js"

class OrderedMap {
  constructor() {
    this.clear()
  }

  clear() {
    this._hash = new NullObject

    if (this._keys) {
      this._keys.length =
      this._values.length = 0
    } else {
      this._keys = []
      this._values = []
    }

    return this
  }

  get(key) {
    return this._values[this._hash[key]]
  }

  has(key) {
    return key in this._hash
  }

  keys() {
    return this._keys
  }

  set(key, value) {
    const { _hash, _keys, _values } = this

    if (key in _hash) {
      _values[_hash[key]] = value
    } else {
      const { length } = _keys

      _hash[key] = length
      _keys[length] = key
      _values[length] = value
    }

    return this
  }

  values() {
    return this._values
  }
}

Object.setPrototypeOf(OrderedMap.prototype, null)

export default OrderedMap
