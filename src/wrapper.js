// This module is important for `@std/esm` versioning support and should be
// changed as little as possible. Please ensure any changes are backwards
// compatible.

import GenericArray from "./generic/array.js"
import GenericFunction from "./generic/function.js"
import GenericObject from "./generic/object.js"

import has from "./util/has.js"
import maxSatisfying from "./util/max-satisfying.js"
import setProperty from "./util/set-property.js"
import setSilent from "./util/set-silent.js"
import shared from "./shared.js"
import silent from "./util/silent.js"
import { version } from "./version.js"

class Wrapper {
  static find(object, key, range) {
    const map = getMap(object, key)

    if (map) {
      const maxVersion = maxSatisfying(map.versions, range)

      if (maxVersion) {
        return map.wrappers[maxVersion]
      }
    }

    return null
  }

  static manage(object, key, wrapper) {
    const value = Wrapper.unwrap(object, key)
    const manager = function (...args) {
      return GenericFunction.call(wrapper, this, manager, value, args)
    }

    setProperty(manager, shared.symbol.wrapper, {
      enumerable: false,
      value
    })

    setSilent(object, key, manager)
  }

  static unwrap(object, key) {
    const manager = silent(() => object[key])
    const symbol = shared.symbol.wrapper
    return has(manager, symbol) ? manager[symbol]  : manager
  }

  static wrap(object, key, wrapper) {
    const map = getOrCreateMap(object, key)

    if (typeof map.wrappers[version] !== "function") {
      GenericArray.push(map.versions, version)
      map.wrappers[version] = wrapper
    }
  }
}

function createMap(object, key) {
  // Store the wrapper map as `object[shared.symbol.wrapper][key]` rather than
  // on the function, so that other code can modify the same property without
  // interfering with our wrapper logic.
  return getOrCreateStore(object)[key] = {
    __proto__: null,
    raw: Wrapper.unwrap(object, key),
    versions: [],
    wrappers: { __proto__: null }
  }
}

function createStore(object) {
  const value = { __proto__: null }

  setProperty(object, shared.symbol.wrapper, {
    enumerable: false,
    value
  })

  return value
}

function getMap(object, key) {
  const store = getStore(object)
  return (store && key in store) ? store[key] : null
}

function getOrCreateMap(object, key) {
  return getMap(object, key) || createMap(object, key)
}

function getOrCreateStore(object) {
  return getStore(object) || createStore(object)
}

function getStore(object) {
  const symbol = shared.symbol.wrapper
  return has(object, symbol) ? object[symbol] : null
}

GenericObject.setPrototypeOf(Wrapper.prototype, null)

export default Wrapper
