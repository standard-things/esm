import ENTRY from "../../constant/entry.js"

import Entry from "../../entry.js"
import Module from "../../module.js"

import errors from "../../errors.js"
import esmLoad from "./load.js"
import esmParse from "./parse.js"
import esmResolveFilename from "./resolve-filename.js"
import isError from "../../util/is-error.js"
import isPath from "../../util/is-path.js"
import { resolve } from "../../safe/path.js"
import shared from "../../shared.js"

const {
  ERR_INVALID_ESM_FILE_EXTENSION
} = errors

const {
  TYPE_CJS,
  TYPE_ESM
} = ENTRY

function esmImport(request, parentEntry, setterArgsList, isDynamic) {
  const { compileData } = parentEntry

  const dependencySpecifiers = compileData === null
    ? null
    : compileData.dependencySpecifiers

  let mod = null
  let entry = null

  if (dependencySpecifiers !== null &&
      Reflect.has(dependencySpecifiers, request) &&
      dependencySpecifiers[request].entry !== null)  {
    entry = dependencySpecifiers[request].entry
  } else {
    entry = isDynamic
      ? tryPhase(esmParse, request, parentEntry)
      : tryPhase(esmLoad, request, parentEntry)
  }

  if (entry !== null) {
    mod = entry.module

    if (parentEntry.extname === ".mjs" &&
        entry.type === TYPE_ESM &&
        entry.extname !== ".mjs") {
      throw ERR_INVALID_ESM_FILE_EXTENSION(mod)
    }

    entry.addSetters(setterArgsList, parentEntry)
  }

  const exported = tryRequire(request, parentEntry)

  if (entry === null) {
    // Create the child entry for unresolved mocked requests.
    entry = getEntryFrom(request, exported)
    mod = entry.module
    parentEntry.children[entry.name] = entry
    entry.addSetters(setterArgsList, parentEntry)
  }

  let mockEntry = null

  if (mod.exports !== exported) {
    // Update the mock entry before the original child entry so dynamic import
    // requests are resolved with the mock entry instead of the child entry.
    mockEntry = getEntryFrom(request, exported)
    parentEntry.children[entry.name] = mockEntry
    mockEntry.addSetters(setterArgsList, parentEntry)
    mockEntry.loaded()
    mockEntry.updateBindings()
  }

  entry.loaded()
  entry.updateBindings()

  if (mockEntry !== null) {
    // Update the mock entry after the original child entry so static import
    // requests are updated with mock entry setters last.
    mockEntry.updateBindings()
  }
}

function getEntryFrom(request, exported) {
  const entry = shared.entry.cache.get(exported)

  if (entry !== void 0) {
    return entry
  }

  const filename = tryResolveFilename(request)
  const mod = new Module(filename)

  if (isPath(filename)) {
    mod.filename = filename
  }

  mod.exports = exported
  mod.loaded = true
  return Entry.get(mod)
}

function tryPhase(phase, request, parentEntry) {
  const { moduleState } = shared

  moduleState.requireDepth += 1

  let error

  try {
    return phase(request, parentEntry.module)
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

function tryResolveFilename(request, parent) {
  try {
    return esmResolveFilename(request, parent)
  } catch {}

  try {
    return Module._resolveFilename(request, parent)
  } catch {}

  if (isPath(request)) {
    const parentFilename = parent && parent.filename

    return typeof parentFilename === "string"
      ? resolve(parentFilename, request)
      : resolve(request)
  }

  return request
}

export default esmImport
