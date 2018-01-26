// Based on Node's `Module._load` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/module.js

import Entry from "../entry.js"
import Module from "../module.js"

import moduleState from "./state.js"

const compileSym = Symbol.for("@std/esm:module._compile")

function load(request, parent, isMain, state, loader) {
  let child
  let filename
  let entry = request

  if (typeof request === "string") {
    filename = request
    child = state._cache[filename]

    if (child) {
      entry = Entry.get(child)
    }
  } else {
    child = entry.module
    filename = child.filename
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
    child = new Module(filename, parent)
    child.filename = filename

    if (isMain) {
      moduleState.mainModule =
      process.mainModule = child
      child.id = "."
    }

    entry = Entry.get(child)
    entry.id = filename
    entry.parent = Entry.get(parent)
    entry.state = moduleState.parsing ? 1 : 3
  }

  const { _compile } = child

  child._compile = (content, filename) => {
    delete child._compile

    const func = typeof child[compileSym] === "function"
      ? child[compileSym]
      : _compile

    return func.call(child, content, filename)
  }

  tryLoad(entry, state, loader)
  return entry
}

function tryLoad(entry, state, loader) {
  const { id } = entry
  state._cache[id] = entry.module

  let threw = true

  try {
    loader(entry)
    threw = false
  } finally {
    if (threw) {
      delete state._cache[id]
    }
  }
}

export default load
