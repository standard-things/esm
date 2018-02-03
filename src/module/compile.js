// Based on Node's `Module#_compile` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/module.js

import Entry from "../entry.js"
import Module from "../module.js"
import NullObject from "../null-object.js"
import Package from "../package.js"

import _compile from "./_compile.js"
import binding from "../binding.js"
import { dirname } from "path"
import encodeId from "../util/encode-id.js"
import getCacheFileName from "../util/get-cache-file-name.js"
import makeRequireFunction from "./make-require-function.js"
import md5 from "../util/md5.js"
import noDeprecationWarning from "../warning/no-deprecation-warning.js"
import shared from "../shared.js"
import stripShebang from "../util/strip-shebang.js"
import vm from "vm"

// Lazily resolve `process.argv[1]`.
// Needed for setting the breakpoint when called with --inspect-brk.
let resolvedArgv

const { now } = Date

const inspectorBinding = binding.inspector
const callAndPauseOnStart = noDeprecationWarning(() => inspectorBinding.callAndPauseOnStart)
const runInDebugContext = noDeprecationWarning(() => vm.runInDebugContext)

const useRunInDebugContext = typeof runInDebugContext === "function"

function compile(content, filename) {
  const entry = Entry.get(this)

  if (! entry.state) {
    entry.cacheName = getCacheFileName(entry, content)
    entry.package = Package.get("")
    entry.runtimeName = encodeId("_" + md5(now().toString()).slice(0, 3))

    _compile(compile, entry, content, filename)
    return
  }

  const pkg = entry.package
  const { cacheName } = entry
  const { cachePath } = pkg
  const cached = pkg.cache[cacheName]
  const wrapper = Module.wrap(stripShebang(content))

  const buffer =
    (cached && cached.scriptData) ||
    void 0

  const script = new vm.Script(wrapper, {
    cachedData: buffer,
    columnOffset: 0,
    displayErrors: true,
    filename,
    lineOffset: 0,
    produceCachedData: true
  })

  let changed = false
  let scriptData = null

  const { cachedDataRejected } = script

  if (script.cachedDataProduced &&
      ! cachedDataRejected) {
    changed = ! buffer
    scriptData = script.cachedData
  }

  if (cached) {
    if (scriptData) {
      cached.scriptData = scriptData
    } else if (cachedDataRejected) {
      changed = true

      const meta = cached["data.json"][cacheName]

      if (meta) {
        meta[0] =
        meta[1] = -1
      }

      delete cached.scriptData
    }
  }

  if (changed &&
      cachePath &&
      cacheName) {
    const pendingMetas =
      shared.pendingMetas[cachePath] ||
      (shared.pendingMetas[cachePath] = new NullObject)
    pendingMetas[cacheName] = scriptData
  }

  const compiledWrapper = script.runInThisContext({
    columnOffset: 0,
    displayErrors: true,
    filename,
    lineOffset: 0
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
      delete process._breakFirstLine
      inspectorWrapper = callAndPauseOnStart

      if (useRunInDebugContext &&
          typeof inspectorWrapper !== "function") {
        const Debug = runInDebugContext("Debug")
        Debug.setBreakPoint(compiledWrapper, 0, 0)
      }
    }
  }

  const exported = this.exports
  const req = makeRequireFunction(this)

  entry.state = 3

  let result

  if (inspectorWrapper) {
    result = inspectorWrapper.call(inspectorBinding, compiledWrapper,
      exported, exported, req, this, filename, dirname(filename))
  } else {
    result = compiledWrapper.call(
      exported, exported, req, this, filename, dirname(filename))
  }

  entry.state = 4
  return result
}

export default compile
