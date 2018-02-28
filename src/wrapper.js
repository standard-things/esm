// This module is important for `@std/esm` versioning support and should be
// changed as little as possible. Please ensure any changes are backwards
// compatible.

import GenericArray from "./generic/array.js"

import has from "./util/has.js"
import maskFunction from "./util/mask-function.js"
import maxSatisfying from "./util/max-satisfying.js"
import setProperty from "./util/set-property.js"
import setSilent from "./util/set-silent.js"
import shared from "./shared.js"
import silent from "./util/silent.js"
import toExternalFunction from "./util/to-external-function.js"
import { version } from "./version.js"

const Wrapper = {
  __proto__: null,
  find(object, key, range) {
    const map = getMap(object, key)

    if (map) {
      const maxVersion = maxSatisfying(map.versions, range)

      if (maxVersion) {
        return map.wrappers[maxVersion]
      }
    }

    return null
  },
  manage(object, key, wrapper) {
    const value = Wrapper.unwrap(object, key)
    const manager = maskFunction(function (...args) {
      return Reflect.apply(wrapper, this, [manager, value, args])
    }, value)

    setProperty(manager, shared.symbol.wrapper, {
      enumerable: false,
      value
    })

    setSilent(object, key, manager)
  },
  unwrap(object, key) {
    const manager = silent(() => object[key])
    const symbol = shared.symbol.wrapper
    return has(manager, symbol) ? manager[symbol]  : manager
  },
  wrap(object, key, wrapper) {
    const map = getOrCreateMap(object, key)

    if (typeof map.wrappers[version] !== "function") {
      GenericArray.push(map.versions, version)
      map.wrappers[version] = toExternalFunction(wrapper)
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

export default Wrapper
