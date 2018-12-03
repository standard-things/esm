import ENTRY from "../../constant/entry.js"

import Entry from "../../entry.js"
import Module from "../../module.js"

import errors from "../../errors.js"
import esmLoad from "./load.js"
import esmParse from "./parse.js"
import esmResolveFilename from "./resolve-filename.js"
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

function esmImport(entry, request, setterArgsList, isDynamic) {
  const { compileData } = entry

  const dependencySpecifiers = compileData === null
    ? null
    : compileData.dependencySpecifiers

  let child = null
  let childEntry = null

  if (dependencySpecifiers !== null &&
      Reflect.has(dependencySpecifiers, request) &&
      dependencySpecifiers[request].entry !== null)  {
    childEntry = dependencySpecifiers[request].entry
  } else {
    childEntry = isDynamic
      ? tryPhase(esmParse, request, entry)
      : tryPhase(esmLoad, request, entry)
  }

  if (childEntry !== null) {
    child = childEntry.module

    if (entry.extname === ".mjs" &&
        childEntry.type === TYPE_ESM &&
        childEntry.extname !== ".mjs") {
      throw ERR_INVALID_ESM_FILE_EXTENSION(child)
    }

    childEntry.addSetters(setterArgsList, entry)
  }

  const exported = tryRequire(request, entry)

  if (childEntry === null) {
    // Create the child entry for unresolved mocked requests.
    childEntry = getEntryFrom(request, exported)
    child = childEntry.module
    entry.children[childEntry.name] = childEntry
    childEntry.addSetters(setterArgsList, entry)
  }

  let mockEntry = null

  if (child.exports !== exported) {
    mockEntry =
    entry.children[childEntry.name] = getEntryFrom(request, exported)

    // Update the mock entry before the original child entry so dynamic import
    // requests are resolved with the mock entry instead of the child entry.
    mockEntry.addSetters(setterArgsList, entry)
    mockEntry.loaded()
    mockEntry.updateBindings()
  }

  childEntry.loaded()
  childEntry.updateBindings()

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
  const child = new Module(filename)

  if (isPath(filename)) {
    child.filename = filename
  }

  child.exports = exported
  child.loaded = true
  return Entry.get(child)
}

function tryPhase(phase, request, entry) {
  const { moduleState } = shared

  let error
  let childEntry = null
  let threw = true

  moduleState.requireDepth += 1

  try {
    childEntry = phase(request, entry.module)
    threw = false
  } catch (e) {
    error = e
  }

  moduleState.requireDepth -= 1

  if (threw &&
      (entry.extname === ".mjs" ||
       error.code !== "MODULE_NOT_FOUND")) {
    throw error
  }

  return childEntry
}

function tryRequire(request, entry) {
  const { moduleState } = shared

  entry._require = TYPE_ESM
  moduleState.requireDepth += 1

  let exported

  try {
    exported = entry.module.require(request)
  } finally {
    entry._require = TYPE_CJS
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
