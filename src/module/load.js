// Based on Node's `Module._load` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/module.js

import Module from "../module.js"

import builtinModules from "../builtin-modules.js"
import moduleState from "./state.js"
import resolveFilename from "./resolve-filename.js"

function load(request, parent, isMain) {
  const Parent = parent ? parent.constructor : Module
  const filePath = resolveFilename(request, parent, isMain)
  const state = parent ? Parent : moduleState

  if (filePath in state._cache) {
    const child = state._cache[filePath]
    const children = parent && parent.children

    if (children && children.indexOf(child) < 0) {
      children.push(child)
    }

    return child.exports
  }

  if (filePath in builtinModules) {
    return builtinModules[filePath].exports
  }

  const child = new Parent(filePath, parent)

  if (isMain) {
    process.mainModule = child
    child.id = "."
  }

  tryModuleLoad(child, filePath, state)
  return child.exports
}

function tryModuleLoad(mod, filePath, state) {
  let threw = true
  state._cache[filePath] = mod

  try {
    mod.load(filePath)
    threw = false
  } finally {
    if (threw) {
      delete state._cache[filePath]
    }
  }
}

export default load
