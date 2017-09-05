// Based on Node's `Module._load` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/module.js

import Module from "../module.js"

import moduleState from "./state.js"

function load(filePath, parent, isMain, state, loader) {
  let child = state
    ? state.cache[filePath]
    : moduleState.cache[filePath] || __non_webpack_require__.cache[filePath]

  if (child) {
    const children = parent && parent.children

    if (children && children.indexOf(child) === -1) {
      children.push(child)
    }

    return child
  }

  const Parent = parent ? parent.constructor : Module
  child = new Parent(filePath, parent)

  if (isMain) {
    process.mainModule = child
    child.id = "."
  }

  tryLoad(child, filePath, state, loader)
  return child
}

function tryLoad(mod, filePath, state, loader = mod.load) {
  if (state) {
    state.cache[filePath] = mod
  } else {
    moduleState.cache[filePath] =
    __non_webpack_require__.cache[filePath] = mod
  }

  let threw = true

  try {
    loader.call(mod, filePath)
    threw = false
  } finally {
    if (threw) {
      if (state) {
        delete state.cache[filePath]
      } else {
        delete moduleState.cache[filePath]
        delete __non_webpack_require__.cache[filePath]
      }
    }
  }
}

export default load
