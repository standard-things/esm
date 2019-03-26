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
import has from "../../util/has.js"
import isFileOrigin from "../../util/is-file-origin.js"
import realProcess from "../../real/process.js"
import setProperty from "../../util/set-property.js"
import shared from "../../shared.js"
import toExternalFunction from "../../util/to-external-function.js"

const {
  STATE_PARSING_COMPLETED
} = ENTRY

function load(filename, parent, isMain = false, cache, loader) {
  const loaderModuleState = Loader.state.module
  const { parsing } = shared.moduleState

  let entry
  let mod = cache[filename]

  if (mod === void 0 &&
      cache === loaderModuleState.scratchCache) {
    mod = Module._cache[filename]
  }

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
  } else if (has(builtinEntries, filename)) {
    return builtinEntries[filename]
  } else {
    mod = new Module(filename, parent)

    mod.filename = isFileOrigin(filename)
      ? getFilePathfromURL(filename)
      : filename

    entry = Entry.get(mod)

    if (isMain) {
      mod.id = "."
      loaderModuleState.mainModule = mod
      realProcess.mainModule = mod
    }
  }

  const { compileData } = entry
  const ext = entry.extname

  if (foundMod ||
      (compileData !== null &&
       compileData.code !== null) ||
      ext === ".json" ||
      ext === ".wasm") {
    loader(entry)

    return entry
  }

  const { _compile } = mod
  const shouldRestore = has(mod, "_compile")

  setProperty(mod, "_compile", toExternalFunction(function (content, filename) {
    if (shouldRestore) {
      setProperty(this, "_compile", _compile)
    } else {
      Reflect.deleteProperty(this, "_compile")
    }

    const compileWrapper = has(this, shared.symbol._compile)
      ? this[shared.symbol._compile]
      : null

    let compile = _compile

    if (typeof compileWrapper === "function") {
      compile = compileWrapper
      Reflect.deleteProperty(this, shared.symbol._compile)
    }

    return Reflect.apply(compile, this, [content, filename])
  }))

  loader(entry)

  return entry
}

export default load
