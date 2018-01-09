// Based on Node's `Module._load` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/module.js

import Entry from "../entry.js"
import Module from "../module.js"

import moduleState from "./state.js"

const compileSym = Symbol.for("@std/esm:module._compile")

function load(request, parent, isMain, state, loader) {
  let child
  let filePath
  let entry = request

  if (typeof request === "string") {
    filePath = request
    child = state._cache[filePath]

    if (child) {
      entry = Entry.get(child)
    }
  } else {
    filePath = entry.filePath
    child = entry.module
  }

  if (child) {
    const children = parent && parent.children

    if (children &&
        children.indexOf(child) === -1) {
      children.push(child)
    }

    if (child.loaded ||
        moduleState.parsing) {
      return entry
    }

    if (! moduleState.parsing &&
        entry.state !== 2) {
      return entry
    }

    entry.state = 3
  } else {
    child = new Module(filePath, parent)
    child.filename = filePath

    if (isMain) {
      moduleState.mainModule =
      process.mainModule = child
      child.id = "."
    }

    entry = Entry.get(child)
    entry.cacheKey = filePath

    if (moduleState.parsing) {
      entry.state = 1
    }
  }

  const { _compile } = child

  child._compile = (content, filePath) => {
    delete child._compile

    const func = typeof child[compileSym] === "function"
      ? child[compileSym]
      : _compile

    return func.call(child, content, filePath)
  }

  tryLoad(entry, state, loader)
  return entry
}

function tryLoad(entry, state, loader) {
  const { cacheKey } = entry
  state._cache[cacheKey] = entry.module

  let threw = true

  try {
    loader(entry)
    threw = false
  } finally {
    if (threw) {
      delete state._cache[cacheKey]
    }
  }
}

export default load
