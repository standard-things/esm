import ENTRY from "../../constant/entry.js"

import Entry from "../../entry.js"
import Module from "../../module.js"

import cjsValidate from "../cjs/validate.js"
import errors from "../../errors.js"
import esmLoad from "./load.js"
import esmParse from "./parse.js"
import esmResolveFilename from "./resolve-filename.js"
import esmValidate from "./validate.js"
import isError from "../../util/is-error.js"
import isPath from "../../util/is-path.js"
import { resolve } from "../../safe/path.js"
import shared from "../../shared.js"

const {
  ERR_INVALID_ESM_FILE_EXTENSION
} = errors

const {
  TYPE_ESM,
  UPDATE_TYPE_INIT
} = ENTRY

function esmImport(request, parentEntry, setterArgsList, isDynamic = false) {
  const { moduleState } = shared
  const { parsing } = moduleState

  let entry = null

  if (parsing ||
      isDynamic) {
    if (isDynamic) {
      moduleState.parsing = true
    }

    try {
      entry = tryPhase(esmParse, request, parentEntry, (entry) => {
        parentEntry.children[entry.name] = entry
        entry.addSetters(setterArgsList, parentEntry)
      })
    } finally {
      if (entry !== null) {
        entry.updateBindings()
      }

      if (isDynamic) {
        moduleState.parsing = false

        if (entry !== null &&
            entry.type === TYPE_ESM) {
          esmValidate(entry)
        }
      }
    }
  } else {
    entry = tryPhase(esmLoad, request, parentEntry, (entry) => {
      parentEntry.children[entry.name] = entry
      entry.addSetters(setterArgsList, parentEntry)
    })
  }

  let finalizeCalled = false

  function finalize() {
    if (finalizeCalled) {
      return
    }

    finalizeCalled = true

    const exported = tryRequire(request, parentEntry)

    if (entry === null) {
      // Create the child entry for unresolved mocked requests.
      entry = getEntryFrom(request, exported, parentEntry)
      parentEntry.children[entry.name] = entry
      entry.addSetters(setterArgsList, parentEntry)
    }

    if (entry.module.exports !== exported) {
      const { name } = entry

      entry = getEntryFrom(request, exported, parentEntry)
      parentEntry.children[name] = entry
      entry.addSetters(setterArgsList, parentEntry)
    }

    entry.loaded()
    entry.updateBindings(null, UPDATE_TYPE_INIT)

    if (parentEntry.id === "<repl>") {
      cjsValidate(parentEntry)
    } else if (entry.type === TYPE_ESM) {
      cjsValidate(entry)
    }
  }

  if (entry !== null) {
    if (parentEntry.extname === ".mjs" &&
        entry.type === TYPE_ESM &&
        entry.extname !== ".mjs") {
      throw ERR_INVALID_ESM_FILE_EXTENSION(entry.module)
    }

    if (parsing) {
      entry._finalize = finalize
    }
  }

  if (parsing) {
    if (entry === null) {
      const exported = tryRequire(request, parentEntry)

      // Create the child entry for unresolved mocked requests.
      entry = getEntryFrom(request, exported, parentEntry)
      parentEntry.children[entry.name] = entry
      entry.addSetters(setterArgsList, parentEntry)
    }
  } else {
    finalize()
  }
}

function getEntryFrom(request, exported, parentEntry) {
  const entry = shared.entry.cache.get(exported)

  if (entry !== void 0) {
    return entry
  }

  const filename = tryResolveFilename(request, parentEntry.module, false)
  const mod = new Module(filename)

  if (isPath(filename)) {
    mod.filename = filename
  }

  mod.exports = exported
  mod.loaded = true
  return Entry.get(mod)
}

function tryPhase(phase, request, parentEntry, preload) {
  const { moduleState } = shared

  moduleState.requireDepth += 1

  let error

  try {
    return phase(request, parentEntry.module, false, preload)
  } catch (e) {
    error = e
  }

  moduleState.requireDepth -= 1

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
  const { moduleState } = shared

  parentEntry._passthruRequire = true
  moduleState.requireDepth += 1

  let exported

  try {
    exported = parentEntry.module.require(request)
  } finally {
    parentEntry._passthruRequire = false
    moduleState.requireDepth -= 1
  }

  return exported
}

function tryResolveFilename(request, parent, isMain) {
  try {
    return esmResolveFilename(request, parent, isMain)
  } catch {}

  try {
    return Module._resolveFilename(request, parent, isMain)
  } catch {}

  if (isPath(request)) {
    const parentFilename = parent.filename

    return typeof parentFilename === "string"
      ? resolve(parentFilename, request)
      : resolve(request)
  }

  return request
}

export default esmImport
