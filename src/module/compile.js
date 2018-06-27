// Based on Node's `Module#_compile`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js

import ENTRY from "../constant/entry.js"

import Entry from "../entry.js"
import Module from "../module.js"
import Package from "../package.js"

import _compile from "./_compile.js"
import binding from "../binding.js"
import dirname from "../path/dirname.js"
import getCacheName from "../util/get-cache-name.js"
import getSilent from "../util/get-silent.js"
import makeRequireFunction from "./make-require-function.js"
import realProcess from "../real/process.js"
import realVM from "../real/vm.js"
import shared from "../shared.js"
import stripShebang from "../util/strip-shebang.js"

const {
  STATE_EXECUTION_COMPLETED,
  STATE_EXECUTION_STARTED,
  STATE_INITIAL
} = ENTRY

// Lazily resolve `process.argv[1]`.
// Needed for setting the breakpoint when called with --inspect-brk.
let resolvedArgv

const runInDebugContext = getSilent(realVM, "runInDebugContext")

const useRunInDebugContext = typeof runInDebugContext === "function"

function compile(content, filename) {
  const entry = Entry.get(this)

  if (entry.state === STATE_INITIAL) {
    entry.cacheName = getCacheName(entry, content)
    entry.package = Package.get("")
    entry.runtimeName = shared.runtimeName

    let result

    try {
      result = _compile(compile, entry, content, filename)
    } finally {
      entry.state = STATE_INITIAL
    }

    return result
  }

  const { cacheName, compileData } = entry
  const { cachePath } = entry.package
  const wrapper = Module.wrap(stripShebang(content))

  let cachedData

  if (compileData &&
      compileData !== true) {
    cachedData =
      compileData.scriptData ||
      void 0
  }

  let scriptOptions

  if (shared.support.createCachedData) {
    scriptOptions = {
      cachedData,
      filename
    }
  } else {
    scriptOptions = {
      cachedData,
      filename,
      produceCachedData: true
    }
  }

  const script = new realVM.Script(wrapper, scriptOptions)

  if (cachePath) {
    const pendingScripts =
      shared.pendingScripts[cachePath] ||
      (shared.pendingScripts[cachePath] = { __proto__: null })

    pendingScripts[cacheName] = script
  }

  let compiledWrapper

  if (shared.unsafeGlobal === shared.defaultGlobal) {
    compiledWrapper = script.runInThisContext({
      filename
    })
  } else {
    compiledWrapper = script.runInContext(shared.unsafeContext, {
      filename
    })
  }

  let inspectorWrapper = null

  if (realProcess._breakFirstLine &&
      realProcess._eval == null) {
    if (resolvedArgv === void 0) {
      // Enter the REPL if not given a file path argument.
      resolvedArgv = realProcess.argv[1]
        ? Module._resolveFilename(realProcess.argv[1])
        : "repl"
    }

    // Set breakpoint on module start.
    if (filename === resolvedArgv) {
      Reflect.deleteProperty(realProcess, "_breakFirstLine")
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

  entry.state = STATE_EXECUTION_STARTED

  let result

  if (inspectorWrapper) {
    result = inspectorWrapper(compiledWrapper, exported,
      exported, req, this, filename, dirname(filename))
  } else {
    result = Reflect.apply(compiledWrapper, exported,
      [exported, req, this, filename, dirname(filename)])
  }

  entry.state = STATE_EXECUTION_COMPLETED
  return result
}

export default compile
