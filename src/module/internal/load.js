// Based on `Module._load()`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js

import ENTRY from "../../constant/entry.js"

import Entry from "../../entry.js"
import GenericArray from "../../generic/array.js"
import Loader from "../../loader.js"
import Module from "../../module.js"

import builtinEntries from "../../builtin-entries.js"
import getFilePathfromURL from "../../util/get-file-path-from-url.js"
import isFileOrigin from "../../util/is-file-origin.js"
import realProcess from "../../real/process.js"
import shared from "../../shared.js"

const {
  STATE_PARSING_COMPLETED
} = ENTRY

function load(filename, parent, isMain = false, cache, loader) {
  const { parsing } = shared.moduleState

  let entry
  let mod = cache[filename]

  const foundMod = mod !== void 0

  if (foundMod) {
    const children = parent != null && parent.children

    if (Array.isArray(children) &&
        GenericArray.indexOf(children, mod) === -1) {
      GenericArray.push(children, mod)
    }

    entry = Entry.get(mod)

    if (parsing ||
        mod.loaded ||
        entry.state !== STATE_PARSING_COMPLETED) {
      return entry
    }
  } else if (Reflect.has(builtinEntries, filename)) {
    return builtinEntries[filename]
  } else {
    mod = new Module(filename, parent)

    mod.filename = isFileOrigin(filename)
      ? getFilePathfromURL(filename)
      : filename

    entry = Entry.get(mod)

    if (isMain) {
      mod.id = "."
      realProcess.mainModule = mod
      Loader.state.module.mainModule = mod
    }
  }

  if (! foundMod) {
    const { _compile } = mod

    mod._compile = (content, filename) => {
      Reflect.deleteProperty(mod, "_compile")

      const symbol = shared.symbol._compile

      const func = typeof mod[symbol] === "function"
        ? mod[symbol]
        : _compile

      return Reflect.apply(func, mod, [content, filename])
    }
  }

  loader(entry)
  return entry
}

export default load
