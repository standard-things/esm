// Based on Node's `Module._load`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js

import ENTRY from "../../constant/entry.js"

import Entry from "../../entry.js"
import GenericArray from "../../generic/array.js"
import Module from "../../module.js"

import builtinEntries from "../../builtin-entries.js"
import esmState from "../esm/state.js"
import getFilePathfromURL from "../../util/get-file-path-from-url.js"
import isFileOrigin from "../../util/is-file-origin.js"
import realProcess from "../../real/process.js"
import shared from "../../shared.js"

const {
  STATE_EXECUTION_STARTED,
  STATE_PARSING_COMPLETED,
  STATE_PARSING_STARTED
} = ENTRY

function load(filename, parent, isMain, state, loader) {
  const { parsing } = shared.moduleState

  let entry
  let child = state._cache[filename]

  if (child) {
    const children = parent && parent.children

    if (children &&
        GenericArray.indexOf(children, child) === -1) {
      GenericArray.push(children, child)
    }

    entry = Entry.get(child)

    if (parsing ||
        child.loaded ||
        entry.state !== STATE_PARSING_COMPLETED) {
      return entry
    }
  } else if (Reflect.has(builtinEntries, filename)) {
    return builtinEntries[filename]
  } else {
    child = new Module(filename, parent)

    child.filename = isFileOrigin(filename)
      ? getFilePathfromURL(filename)
      : filename

    if (isMain) {
      esmState.mainModule =
      realProcess.mainModule = child
      child.id = "."
    }

    entry = Entry.get(child)
    entry.id = filename
    entry.parent = Entry.get(parent)
  }

  entry.state = parsing
    ? STATE_PARSING_STARTED
    : STATE_EXECUTION_STARTED

  const { _compile } = child

  child._compile = (content, filename) => {
    Reflect.deleteProperty(child, "_compile")

    const symbol = shared.symbol._compile
    const func = typeof child[symbol] === "function"
      ? child[symbol]
      : _compile

    return Reflect.apply(func, child, [content, filename])
  }

  loader(entry)
  return entry
}

export default load
