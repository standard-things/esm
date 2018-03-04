// Based on Node's `Module#_compile` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/module.js

import ENTRY from "../constant/entry.js"

import Entry from "../entry.js"
import Module from "../module.js"
import Package from "../package.js"

import _compile from "./_compile.js"
import binding from "../binding.js"
import { dirname } from "path"
import getCacheFileName from "../util/get-cache-file-name.js"
import getSilent from "../util/get-silent.js"
import makeRequireFunction from "./make-require-function.js"
import shared from "../shared.js"
import stripShebang from "../util/strip-shebang.js"
import vm from "vm"

const {
  STATE
} = ENTRY

// Lazily resolve `process.argv[1]`.
// Needed for setting the breakpoint when called with --inspect-brk.
let resolvedArgv

const runInDebugContext = getSilent(vm, "runInDebugContext")

const useRunInDebugContext = typeof runInDebugContext === "function"

function compile(content, filename) {
  const entry = Entry.get(this)

  if (entry.state === STATE.INITIAL) {
    entry.cacheName = getCacheFileName(entry, content)
    entry.package = Package.get("")
    entry.runtimeName = shared.runtimeName

    let result

    try {
      result = _compile(compile, entry, content, filename)
    } finally {
      entry.state = STATE.INITIAL
    }

    return result
  }

  const pkg = entry.package
  const { cacheName } = entry
  const { cache, cachePath } = pkg
  const cached = cache.compile[cacheName]
  const wrapper = Module.wrap(stripShebang(content))

  const cachedData =
    (cached && cached.scriptData) ||
    void 0

  const script = new vm.Script(wrapper, {
    __proto__: null,
    cachedData,
    filename,
    produceCachedData: true
  })

  let changed = false
  let scriptData = null

  const { cachedDataRejected } = script

  if (script.cachedDataProduced &&
      ! cachedDataRejected) {
    changed = ! cachedData
    scriptData = script.cachedData
  }

  if (cached) {
    if (scriptData) {
      cached.scriptData = scriptData
    } else if (cachedData &&
        cachedDataRejected) {
      changed = true

      const meta = cache.map && cache.map[cacheName]

      if (meta) {
        meta[0] =
        meta[1] = -1
      }

      Reflect.deleteProperty(cached, "scriptData")
    }
  }

  if (changed &&
      cachePath &&
      cacheName) {
    const pendingMetas =
      shared.pendingMetas[cachePath] ||
      (shared.pendingMetas[cachePath] = { __proto__: null })

    pendingMetas[cacheName] = scriptData
  }

  const compiledWrapper = script.runInThisContext({
    __proto__: null,
    filename
  })

  let inspectorWrapper = null

  if (process._breakFirstLine &&
      process._eval == null) {
    if (resolvedArgv === void 0) {
      // Enter the REPL if not given a file path argument.
      resolvedArgv = process.argv[1]
        ? Module._resolveFilename(process.argv[1])
        : "repl"
    }

    // Set breakpoint on module start.
    if (filename === resolvedArgv) {
      Reflect.deleteProperty(process, "_breakFirstLine")
      inspectorWrapper = binding.inspector.callAndPauseOnStart

      if (useRunInDebugContext &&
          typeof inspectorWrapper !== "function") {
        const Debug = runInDebugContext("Debug")
        Debug.setBreakPoint(compiledWrapper, 0, 0)
      }
    }
  }

  const exported = this.exports
  const req = makeRequireFunction(this)

  entry.state = STATE.EXECUTION_STARTED

  let result

  if (inspectorWrapper) {
    result = inspectorWrapper(compiledWrapper, exported,
      exported, req, this, filename, dirname(filename))
  } else {
    result = Reflect.apply(compiledWrapper, exported,
      [exported, req, this, filename, dirname(filename)])
  }

  entry.state = STATE.EXECUTION_COMPLETED
  return result
}

export default compile
