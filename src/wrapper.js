// This module is important for `esm` versioning support and should be changed
// as little as possible. Please ensure any changes are backwards compatible.

import ESM from "./constant/esm.js"

import GenericArray from "./generic/array.js"

import has from "./util/has.js"
import maxSatisfying from "./util/max-satisfying.js"
import proxyWrap from "./util/proxy-wrap.js"
import setSilent from "./util/set-silent.js"
import shared from "./shared.js"
import silent from "./util/silent.js"
import stripPrereleaseTag from "./util/strip-prerelease-tag.js"
import toExternalFunction from "./util/to-external-function.js"

function init() {
  const {
    PKG_VERSION
  } = ESM

  const wrapperVersion = stripPrereleaseTag(PKG_VERSION)

  const Wrapper = {
    find(object, name, range) {
      const map = getMap(object, name)

      if (map) {
        const maxVersion = maxSatisfying(map.versions, range)

        if (maxVersion) {
          return map.wrappers[maxVersion]
        }
      }

      return null
    },
    manage(object, name, wrapper) {
      const func = Wrapper.unwrap(object, name)

      const manager = proxyWrap(func, function (func, args) {
        return Reflect.apply(wrapper, this, [manager, func, args])
      })

      Reflect.defineProperty(manager, shared.symbol.wrapper, {
        configurable: true,
        value: func,
        writable: true
      })

      setSilent(object, name, manager)
    },
    unwrap(object, name) {
      const manager = silent(() => object[name])
      const symbol = shared.symbol.wrapper

      return has(manager, symbol) ? manager[symbol]  : manager
    },
    wrap(object, name, wrapper) {
      const map = getOrCreateMap(object, name)

      if (typeof map.wrappers[wrapperVersion] !== "function") {
        GenericArray.push(map.versions, wrapperVersion)
        map.wrappers[wrapperVersion] = toExternalFunction(wrapper)
      }
    }
  }

  function createMap(object, name) {
    // Store the wrapper map as `object[shared.symbol.wrapper][name]` rather
    // than on the function so other code can modify the same property without
    // interfering with our wrapper.
    return getOrCreateStore(object)[name] = {
      raw: Wrapper.unwrap(object, name),
      versions: [],
      wrappers: { __proto__: null }
    }
  }

  function createStore(object) {
    const value = { __proto__: null }

    Reflect.defineProperty(object, shared.symbol.wrapper, {
      configurable: true,
      value,
      writable: true
    })

    return value
  }

  function getMap(object, name) {
    const store = getStore(object)

    return has(store, name) ? store[name] : null
  }

  function getOrCreateMap(object, name) {
    return getMap(object, name) || createMap(object, name)
  }

  function getOrCreateStore(object) {
    return getStore(object) || createStore(object)
  }

  function getStore(object) {
    const symbol = shared.symbol.wrapper

    return has(object, symbol) ? object[symbol] : null
  }

  return Wrapper
}

export default shared.inited
  ? shared.module.Wrapper
  : shared.module.Wrapper = init()
