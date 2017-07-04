class OrderedMap {
  constructor() {
    this.clear()
  }

  clear() {
    this._hash = Object.create(null)

    if (this._keys === void 0) {
      this._keys = []
      this._values = []
    } else {
      this._keys.length =
      this._values.length = 0
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
    const hash = this._hash
    const values = this._values

    if (key in hash) {
      values[hash[key]] = value
    } else {
      const keys = this._keys
      const nextIndex = keys.length

      hash[key] = nextIndex
      keys[nextIndex] = key
      values[nextIndex] = value
    }

    return this
  }

  values() {
    return this._values
  }
}

Object.setPrototypeOf(OrderedMap.prototype, null)

export default OrderedMap
