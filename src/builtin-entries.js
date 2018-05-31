import Entry from "./entry.js"
import Module from "./module.js"
import OwnProxy from "./own/proxy.js"

import builtinConsole from "./builtin/console.js"
import builtinIds from "./builtin-ids.js"
import builtinModules from "./builtin-modules.js"
import builtinUtil from "./builtin/util.js"
import builtinVM from "./builtin/vm.js"
import isObjectLike from "./util/is-object-like.js"
import maskFunction from "./util/mask-function.js"
import proxyExports from "./util/proxy-exports.js"
import realRequire from "./real/require.js"
import setDeferred from "./util/set-deferred.js"
import shared from "./shared.js"
import unwrapProxy from "./util/unwrap-proxy.js"

const funcHasInstance = Function.prototype[Symbol.hasInstance]

function createEntry(id) {
  let exported

  if (id === "console") {
    exported = builtinConsole
  } else if (id === "module") {
    exported = Module
  } else if (id === "util") {
    exported = builtinUtil
  } else if (id === "vm") {
    exported = builtinVM
  } else {
    exported = unwrapProxy(realRequire(id))

    if (id !== "assert" &&
        typeof exported === "function" &&
        shared.support.proxiedClasses) {
      const func = exported
      const proto = func.prototype

      const hasInstance = maskFunction(
        (value) => {
          if (value instanceof func) {
            return true
          }

          if (isObjectLike(value)) {
            let proto = value

            while ((proto = Reflect.getPrototypeOf(proto))) {
              if (proto === proxyProto) {
                return true
              }
            }
          }

          return false
        },
        funcHasInstance
      )

      const proxyProto = new OwnProxy(proto, {
        get(target, name, receiver) {
          const value = Reflect.get(target, name, receiver)

          return value === func ? exported : value
        },
        getOwnPropertyDescriptor(target, name){
          const descriptor = Reflect.getOwnPropertyDescriptor(target, name)

          if (descriptor) {
            const { value } = descriptor

            if (value === func) {
              descriptor.value = exported
            }
          }

          return descriptor
        }
      })

      const proxyFunc = new OwnProxy(func, {
        get(target, name, receiver) {
          if (name === Symbol.hasInstance) {
            return hasInstance
          }

          const value = Reflect.get(target, name, receiver)

          return value === proto ? proxyProto : value
        },
        getOwnPropertyDescriptor(target, name){
          const descriptor = Reflect.getOwnPropertyDescriptor(target, name)

          if (descriptor) {
            const { value } = descriptor

            if (value === proto) {
              descriptor.value = proxyProto
            }
          }

          return descriptor
        }
      })

      exported = proxyFunc
    }
  }

  const mod = builtinModules[id]

  mod.exports = exported
  mod.loaded = true

  const entry = Entry.get(mod)

  entry.builtin = true

  exported =
  entry.exports =
  mod.exports = proxyExports(entry)

  entry.loaded()
  return entry
}

const builtinEntries = { __proto__: null }
const cache = shared.memoize.builtinEntries

for (const id of builtinIds) {
  if (Reflect.has(cache, id)) {
    builtinEntries[id] = cache[id]
  } else {
    setDeferred(builtinEntries, id, () => {
      const entry = createEntry(id)

      if (id !== "module") {
        cache[id] = entry
      }

      return entry
    })
  }
}

export default builtinEntries
