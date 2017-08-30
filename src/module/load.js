// Based on Node's `Module._load` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/module.js

import Module from "../module.js"

import builtinModules from "../builtin-modules.js"
import moduleState from "./state.js"
import resolveFilename from "./cjs/resolve-filename.js"

const BuiltinModule = __non_webpack_module__.constructor

function load(id, parent, isMain, loader, resolver = resolveFilename) {
  const filePath = resolver(id, parent, isMain)

  if (filePath in builtinModules) {
    return builtinModules[filePath].exports
  }

  const Parent = parent ? parent.constructor : Module
  const state = parent ? Parent : moduleState

  let child =
    state._cache[filePath] ||
    (state._cache[filePath] = BuiltinModule._cache[filePath])

  if (child) {
    const children = parent && parent.children

    if (children && children.indexOf(child) < 0) {
      children.push(child)
    }

    return child
  }

  child = new Parent(filePath, parent)

  if (isMain) {
    process.mainModule = child
    child.id = "."
  }

  tryLoad(child, filePath, state, loader)
  return child
}

function tryLoad(mod, filePath, state, loader = mod.load) {
  let threw = true

  state._cache[filePath] =
  BuiltinModule._cache[filePath] = mod

  try {
    loader.call(mod, filePath)
    threw = false
  } finally {
    if (threw) {
      delete state._cache[filePath]
      delete BuiltinModule._cache[filePath]
    }
  }
}

export default load
