// Based on `Module#_compile()`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js

import ENTRY from "../../constant/entry.js"
import ENV from "../../constant/env.js"
import PACKAGE from "../../constant/package.js"

import Entry from "../../entry.js"
import Module from "../../module.js"
import Package from "../../package.js"
import RealModule from "../../real/module.js"

import _compile from "../internal/compile.js"
import createInlineSourceMap from "../../util/create-inline-source-map.js"
import { dirname } from "../../safe/path.js"
import getCacheName from "../../util/get-cache-name.js"
import getSourceMappingURL from "../../util/get-source-mapping-url.js"
import makeRequireFunction from "../internal/make-require-function.js"
import maskFunction from "../../util/mask-function.js"
import realProcess from "../../real/process.js"
import realVM from "../../real/vm.js"
import shared from "../../shared.js"
import stripShebang from "../../util/strip-shebang.js"

const {
  STATE_INITIAL,
  STATE_PARSING_COMPLETED
} = ENTRY

const {
  ELECTRON
} = ENV

const {
  MODE_STRICT
} = PACKAGE

const RealProto = RealModule.prototype

let resolvedArgv
let useBufferArg
let useRunInContext

const compile = maskFunction(function (content, filename) {
  const entry = Entry.get(this)
  const { state } = entry
  const isInitial = state === STATE_INITIAL

  if (entry.package.options.mode !== MODE_STRICT &&
      entry.extname !== ".mjs" &&
      (isInitial ||
       state === STATE_PARSING_COMPLETED)) {
    entry.cacheName = getCacheName(content)
    entry.package = Package.get("")
    entry.runtimeName = shared.runtimeName

    let result

    try {
      result = _compile(compile, entry, content, filename)
    } finally {
      if (isInitial) {
        entry.state = STATE_INITIAL
      }
    }

    return result
  }

  let preparedContent = stripShebang(content)

  if (realProcess._breakFirstLine &&
      realProcess._eval == null) {
    if (resolvedArgv === void 0) {
      // Lazily resolve `process.argv[1]` which is needed for setting the
      // breakpoint when Node is called with the --inspect-brk flag.
      const argv = realProcess.argv[1]

      // Enter the REPL if no file path argument is provided.
      resolvedArgv = argv
        ? Module._resolveFilename(argv)
        : "repl"
    }

    // Set breakpoint on module start.
    if (filename === resolvedArgv) {
      // Remove legacy breakpoint indicator.
      Reflect.deleteProperty(realProcess, "_breakFirstLine")

      if (getSourceMappingURL(preparedContent) === "") {
        preparedContent += createInlineSourceMap(filename, preparedContent)
      }

      preparedContent = "debugger;" + preparedContent
    }
  }

  const { compileData } = entry

  let cachedData

  if (compileData !== null) {
    const { scriptData } = compileData

    if (scriptData !== null) {
      cachedData = scriptData
    }
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

  const { cachePath } = entry.package
  const script = new realVM.Script(Module.wrap(preparedContent), scriptOptions)

  if (cachePath !== "") {
    const { cacheName } = entry
    const { pendingScripts } = shared

    if (! Reflect.has(pendingScripts, cachePath)) {
      pendingScripts[cachePath] = { __proto__: null }
    }

    pendingScripts[cachePath][cacheName] = script
  }

  if (useRunInContext === void 0) {
    useRunInContext = shared.unsafeGlobal !== shared.defaultGlobal
  }

  const exported = this.exports

  const args = [
    exported,
    makeRequireFunction(this),
    this,
    filename,
    dirname(filename)
  ]

  if (ELECTRON) {
    args.push(realProcess, shared.unsafeGlobal)

    if (useBufferArg === void 0) {
      useBufferArg = Module.wrap("").indexOf("Buffer") !== -1
    }

    if (useBufferArg) {
      args.push(shared.external.Buffer)
    }
  }

  const { moduleState } = shared
  const noDepth = moduleState.requireDepth === 0

  if (noDepth) {
    moduleState.statFast = new Map
    moduleState.statSync = new Map
  }

  const compiledWrapper = useRunInContext
    ? script.runInContext(shared.unsafeContext, { filename })
    : script.runInThisContext({ filename })

  const result = Reflect.apply(compiledWrapper, exported, args)

  if (noDepth) {
    moduleState.statFast = null
    moduleState.statSync = null
  }

  return result
}, RealProto._compile)

export default compile
