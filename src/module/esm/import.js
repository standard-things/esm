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
  TYPE_CJS,
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

  if (entry !== null) {
    const mod = entry.module

    if (parentEntry.extname === ".mjs" &&
        entry.type === TYPE_ESM &&
        entry.extname !== ".mjs") {
      throw ERR_INVALID_ESM_FILE_EXTENSION(mod)
    }

    if (parsing) {
      entry.done = done
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

    return
  }

  let doneCalled = false

  function done() {
    if (doneCalled) {
      return
    }

    doneCalled = true

    let mod

    const exported = tryRequire(request, parentEntry)

    if (entry !== null) {
      mod = entry.module

      if (entry.type === TYPE_ESM) {
        cjsValidate(entry)
      }
    }

    if (parentEntry.id === "<repl>") {
      cjsValidate(parentEntry)
    }

    if (entry === null) {
      // Create the child entry for unresolved mocked requests.
      entry = getEntryFrom(request, exported, parentEntry)
      mod = entry.module
      parentEntry.children[entry.name] = entry
      entry.addSetters(setterArgsList, parentEntry)
    }

    let mockEntry = null

    if (mod.exports !== exported) {
      // Update the mock entry before the original child entry so dynamic import
      // requests are resolved with the mock entry instead of the child entry.
      mockEntry = getEntryFrom(request, exported, parentEntry)
      parentEntry.children[entry.name] = mockEntry
      mockEntry.addSetters(setterArgsList, parentEntry)
    }

    if (mockEntry === null) {
      entry.loaded()
      entry.updateBindings(null, UPDATE_TYPE_INIT)
    } else {
      // Update the mock entry after the original child entry so static import
      // requests are updated with mock entry setters last.
      mockEntry.loaded()
      mockEntry.updateBindings(null, UPDATE_TYPE_INIT)
    }
  }

  done()
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
    const entry = phase(request, parentEntry.module, false, preload)

    entry.updateBindings()

    return entry
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

  parentEntry._require = TYPE_ESM
  moduleState.requireDepth += 1

  let exported

  try {
    exported = parentEntry.module.require(request)
  } finally {
    parentEntry._require = TYPE_CJS
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
