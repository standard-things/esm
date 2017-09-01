// Based on Node's `Module._load` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/module.js

import Module from "../module.js"

import builtinModules from "../builtin-modules.js"
import moduleState from "./state.js"
import resolveFilename from "./cjs/resolve-filename.js"

function load(id, parent, isMain, loader, resolver = resolveFilename) {
  const filePath = resolver(id, parent, isMain)

  if (filePath in builtinModules) {
    return builtinModules[filePath]
  }

  const Parent = parent ? parent.constructor : Module
  const state = parent ? Parent : moduleState

  let child =
    moduleState.cache[filePath] ||
    __non_webpack_require__.cache[filePath]

  if (child) {
    const children = parent && parent.children

    if (children && children.indexOf(child) === -1) {
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
  const cache = state._cache || state.cache
  let threw = true


  cache[filePath] =
  __non_webpack_require__.cache[filePath] = mod

  try {
    loader.call(mod, filePath)
    threw = false
  } finally {
    if (threw) {
      delete cache[filePath]
      delete __non_webpack_require__.cache[filePath]
    }
  }
}

export default load
