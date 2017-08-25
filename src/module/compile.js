// Based on Node's `Module#_compile` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/module.js

import { runInDebugContext, runInThisContext } from "vm"
import binding from "../binding.js"
import { dirname } from "path"
import makeRequireFunction from "./make-require-function.js"
import moduleState from "./state.js"
import resolveFilename from "./resolve-filename.js"
import stat from "../fs/stat.js"
import stripShebang from "../util/strip-shebang.js"

// Lazily resolve `process.argv[1]`.
// Needed for setting the breakpoint when called with --inspect-brk.
let resolvedArgv

let { callAndPauseOnStart } = binding.inspector

function compile(mod, content, filePath) {
  const Module = mod.constructor
  const wrapper = Module.wrap(stripShebang(content))

  const compiledWrapper = runInThisContext(wrapper, {
    displayErrors: true,
    filename: filePath,
    lineOffset: 0
  })

  let inspectorWrapper = null

  if (process._breakFirstLine &&
      process._eval == null) {
    if (resolvedArgv === void 0) {
      // We enter the REPL if we're not given a file path argument.
      resolvedArgv = process.argv[1]
        ? resolveFilename(process.argv[1], null, false)
        : "repl"
    }

    // Set breakpoint on module start.
    if (filePath === resolvedArgv) {
      delete process._breakFirstLine
      inspectorWrapper = callAndPauseOnStart

      if (! inspectorWrapper) {
        const Debug = runInDebugContext("Debug")
        Debug.setBreakPoint(compiledWrapper, 0, 0)
      }
    }
  }

  const noDepth = moduleState.requireDepth === 0
  const req = makeRequireFunction(mod)

  if (noDepth) {
    stat.cache = new Map
  }

  let result

  if (inspectorWrapper) {
    result = inspectorWrapper(compiledWrapper, mod.exports, mod.exports,
      req, mod, filePath, dirname(filePath))
  } else {
    result = compiledWrapper.call(mod.exports, mod.exports,
      req, mod, filePath, dirname(filePath))
  }

  if (noDepth) {
    stat.cache = null
  }

  return result
}

export default compile
