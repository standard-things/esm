import ENTRY from "../../constant/entry.js"

import Entry from "../../entry.js"
import Module from "../../module.js"

import dualResolveFilename from "../internal/dual-resolve-filename.js"
import errors from "../../errors.js"
import esmLoad from "./load.js"
import isError from "../../util/is-error.js"
import isPath from "../../util/is-path.js"
import { resolve } from "../../safe/path.js"
import shared from "../../shared.js"
import validateDeep from "./validate-deep.js"
import validateShallow from "./validate-shallow.js"

const {
  TYPE_CJS,
  TYPE_ESM,
  STATE_PARSING_COMPLETED,
  UPDATE_TYPE_INIT
} = ENTRY

function esmImport(request, parentEntry, setterArgsList, isDynamic = false) {
  const { moduleState } = shared
  const { parsing } = moduleState

  let entry = null
  let finalizeCalled = false

  const addChild = (entry, childEntry, name = childEntry.name) => {
    entry.children[name] = childEntry
    childEntry.addSetters(setterArgsList, entry)
  }

  const finalize = () => {
    if (finalizeCalled) {
      return
    }

    finalizeCalled = true

    const exported = tryRequire(request, parentEntry)

    if (entry === null) {
      entry = getEntryFrom(request, exported, parentEntry)
      addChild(parentEntry, entry)
    } else if (! Object.is(entry.module.exports, exported)) {
      const { name } = entry

      entry = getEntryFrom(request, exported, parentEntry)
      addChild(parentEntry, entry, name)
    }

    entry.loaded()
    entry.updateBindings(null, UPDATE_TYPE_INIT)

    validateShallow(entry, parentEntry)
  }

  const preload = (entry) => addChild(parentEntry, entry)

  if (isDynamic ||
      parsing) {
    if (isDynamic) {
      moduleState.parsing = true
    }

    try {
      entry = tryLoad(request, parentEntry, preload)
    } finally {
      if (isDynamic) {
        moduleState.parsing = false
      }
    }

    if (entry !== null) {
      entry.updateBindings()

      if (isDynamic &&
          entry.state === STATE_PARSING_COMPLETED &&
          entry.type !== TYPE_CJS) {
        validateDeep(entry)
      }
    }
  } else {
    entry = tryLoad(request, parentEntry, preload)
  }

  if (parsing) {
    if (entry === null) {
      const exported = tryRequire(request, parentEntry)

      entry = getEntryFrom(request, exported, parentEntry)
      addChild(parentEntry, entry)
    }

    entry._finalize = finalize
  }

  if (! parsing) {
    finalize()
  }
}

function getEntryFrom(request, exported, parentEntry) {
  const { _lastChild } = parentEntry

  if (_lastChild !== null &&
      Object.is(_lastChild.module.exports, exported)) {
    return _lastChild
  }

  const filename = tryDualResolveFilename(request, parentEntry.module)
  const mod = new Module(filename)

  mod.exports = exported
  mod.loaded = true

  if (isPath(filename)) {
    mod.filename = filename
  }

  return Entry.get(mod)
}

function tryDualResolveFilename(request, parent, isMain) {
  try {
    return dualResolveFilename(request, parent, isMain)
  } catch {}

  if (isPath(request)) {
    const parentFilename = parent.filename

    return typeof parentFilename === "string"
      ? resolve(parentFilename, request)
      : resolve(request)
  }

  return request
}

function tryLoad(request, parentEntry, preload) {
  const { moduleState } = shared

  moduleState.requireDepth += 1

  let entry
  let error
  let threw = true

  try {
    entry = esmLoad(request, parentEntry.module, false, preload)
    threw = false
  } catch (e) {
    error = e
  }

  moduleState.requireDepth -= 1

  if (! threw) {
    return entry
  }

  if (parentEntry.extname === ".mjs" ||
      ! isError(error)) {
    throw error
  }

  const { code } = error

  if (code !== "ERR_INVALID_PROTOCOL" &&
      code !== "MODULE_NOT_FOUND") {
    throw error
  }

  return null
}

function tryRequire(request, parentEntry) {
  parentEntry._passthruRequire = true

  try {
    return parentEntry.module.require(request)
  } finally {
    parentEntry._passthruRequire = false
  }
}

export default esmImport
