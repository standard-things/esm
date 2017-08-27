// Based on Node's `Module._load` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/module.js

import Module from "../module.js"

import builtinModules from "../builtin-modules.js"
import moduleState from "./state.js"
import resolveFilename from "./resolve-filename.js"

function load(id, parent, isMain, loader, resolver = resolveFilename) {
  const Parent = parent ? parent.constructor : Module
  const filePath = resolver(id, parent, isMain)
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

  tryModuleLoad(child, filePath, state, loader)
  return child.exports
}

function tryModuleLoad(mod, filePath, state, loader = mod.load) {
  let threw = true
  state._cache[filePath] = mod

  try {
    loader.call(mod, filePath)
    threw = false
  } finally {
    if (threw) {
      delete state._cache[filePath]
    }
  }
}

export default load
