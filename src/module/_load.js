// Based on Node's `Module._load` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js

import ENTRY from "../constant/entry.js"

import Entry from "../entry.js"
import GenericArray from "../generic/array.js"
import Module from "../module.js"

import moduleState from "./state.js"
import shared from "../shared.js"

const {
  STATE_EXECUTION_STARTED,
  STATE_PARSING_COMPLETED,
  STATE_PARSING_STARTED
} = ENTRY

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
        GenericArray.indexOf(children, child) === -1) {
      GenericArray.push(children, child)
    }

    if (child.loaded ||
        moduleState.parsing) {
      return entry
    }

    if (! moduleState.parsing &&
        entry.state !== STATE_PARSING_COMPLETED) {
      return entry
    }

    entry.state = STATE_EXECUTION_STARTED
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
    entry.state = moduleState.parsing
      ? STATE_PARSING_STARTED
      : STATE_EXECUTION_STARTED
  }

  if (moduleState.passthru &&
      ! moduleState.parsing) {
    entry.state = STATE_PARSING_COMPLETED
  } else {
    const { _compile } = child

    child._compile = (content, filename) => {
      Reflect.deleteProperty(child, "_compile")

      const symbol = shared.symbol._compile
      const func = typeof child[symbol] === "function"
        ? child[symbol]
        : _compile

      return Reflect.apply(func, child, [content, filename])
    }
  }

  loader(entry)
  return entry
}

export default load
