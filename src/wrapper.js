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
import toExternalFunction from "./util/to-external-function.js"

function init() {
  const {
    PACKAGE_RANGE
  } = ESM

  const Wrapper = {
    find(object, name, range) {
      const map = getMap(object, name)

      if (map !== null) {
        const maxVersion = maxSatisfying(map.versions, range)

        if (maxVersion !== null) {
          const wrapper = map.wrappers.get(maxVersion)

          if (wrapper !== void 0) {
            return wrapper
          }
        }
      }

      return null
    },
    manage(object, name, wrapper) {
      const func = Wrapper.unwrap(object, name)

      const manager = proxyWrap(func, function (func, args) {
        const newTarget = new.target

        return newTarget === void 0
          ? Reflect.apply(wrapper, this, [manager, func, args])
          : Reflect.construct(wrapper, [manager, func, args], newTarget)
      })

      Reflect.defineProperty(manager, shared.symbol.wrapper, {
        configurable: true,
        value: func
      })

      setSilent(object, name, manager)
    },
    unwrap(object, name) {
      const manager = silent(() => object[name])
      const symbol = shared.symbol.wrapper

      return has(manager, symbol)
        ? manager[symbol]
        : manager
    },
    wrap(object, name, wrapper) {
      const map = getOrCreateMap(object, name)

      if (map.wrappers.get(PACKAGE_RANGE) === void 0) {
        GenericArray.push(map.versions, PACKAGE_RANGE)
        map.wrappers.set(PACKAGE_RANGE, toExternalFunction(wrapper))
      }
    }
  }

  function createMap(object, name) {
    // Store the wrapper map as `object[shared.symbol.wrapper][name]` rather
    // than on the function so other code can modify the same property without
    // interfering with our wrapper.
    const store = getOrCreateStore(object)

    const map = {
      raw: Wrapper.unwrap(object, name),
      versions: [],
      wrappers: new Map
    }

    store.set(name, map)

    return map
  }

  function createStore(object) {
    const value = new Map

    Reflect.defineProperty(object, shared.symbol.wrapper, {
      configurable: true,
      value
    })

    return value
  }

  function getMap(object, name) {
    const store = getStore(object)

    let map

    if (store !== null) {
      map = store.get(name)
    }

    return map === void 0
      ? null
      : map
  }

  function getOrCreateMap(object, name) {
    const map = getMap(object, name)

    return map === null
      ? createMap(object, name)
      : map
  }

  function getOrCreateStore(object) {
    const store = getStore(object)

    return store === null
      ? createStore(object)
      : store
  }

  function getStore(object) {
    const symbol = shared.symbol.wrapper

    return has(object, symbol)
      ? object[symbol]
      : null
  }

  return Wrapper
}

export default shared.inited
  ? shared.module.Wrapper
  : shared.module.Wrapper = init()
