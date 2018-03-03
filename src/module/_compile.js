import { extname, resolve } from "path"

import Compiler from "../caching-compiler.js"
import Module from "../module.js"
import Runtime from "../runtime.js"

import captureStackTrace from "../error/capture-stack-trace.js"
import createSourceMap from "../util/create-source-map.js"
import encodeURI from "../util/encode-uri.js"
import getSourceMappingURL from "../util/get-source-mapping-url.js"
import getURLFromFilePath from "../util/get-url-from-file-path.js"
import isError from "../util/is-error.js"
import isInspect from "../env/is-inspect.js"
import isStackTraceMasked from "../util/is-stack-trace-masked.js"
import keys from "../util/keys.js"
import maskStackTrace from "../error/mask-stack-trace.js"
import moduleState from "./state.js"
import readFile from "../fs/read-file.js"
import readFileFast from "../fs/read-file-fast.js"
import shared from "../shared.js"
import validateESM from "./esm/validate.js"
import warn from "../warn.js"
import wrap from "./wrap.js"

const ExObject = __external__.Object

function compile(caller, entry, content, filename, fallback) {
  const { options } = entry.package

  let hint = "script"
  let type = "script"

  if (options.esm === "all") {
    type = "module"
  } else if (options.esm === "js") {
    type = "unambiguous"
  }

  if (extname(filename) === ".mjs") {
    hint = "module"

    if (type === "script") {
      type = "module"
    }
  }

  const pkg = entry.package
  const { cache } = pkg
  const { cacheName } = entry

  let cached = cache.compile[cacheName]

  if (cached === true) {
    cached = Compiler.from(entry)

    if (cached) {
      cached.code = readCachedCode(resolve(pkg.cachePath, cacheName))
      cache.compile[cacheName] = cached
    } else {
      Reflect.deleteProperty(cache.compile, cacheName)
      Reflect.deleteProperty(cache.map, cacheName)
    }
  }

  if (! cached) {
    cached =
    cache.compile[cacheName] = tryCompileCode(caller, entry, content, { hint, type })
  }

  if (options.warnings &&
      moduleState.parsing) {
    for (const warning of cached.warnings) {
      warn(warning.code, filename, ...warning.args)
    }
  }

  if (moduleState.parsing) {
    const cached = entry.package.cache.compile[entry.cacheName]
    const defaultPkg = shared.package.default
    const isESM = cached && cached.esm
    const { parent } = entry
    const parentPkg = parent && parent.package
    const parentCached = parentPkg && parentPkg.cache.compile[parent.cacheName]
    const parentIsESM = parentCached && parentCached.esm

    if (! isESM &&
        ! parentIsESM &&
        (pkg === defaultPkg ||
         parentPkg === defaultPkg)) {
      return fallback ? fallback() : void 0
    }

    if (isESM &&
        entry.state === 1) {
      tryValidateESM(caller, entry)
    }
  } else {
    entry.state = 3
    return tryCompileCached(entry)
  }
}

function tryCompileCached(entry) {
  const pkg = entry.package
  const cached = pkg.cache.compile[entry.cacheName]
  const isESM = cached && cached.esm
  const noDepth = moduleState.requireDepth === 0
  const tryCompile = isESM ? tryCompileESM : tryCompileCJS

  if (noDepth) {
    moduleState.stat = { __proto__: null }
  }

  let result

  if (pkg.options.debug) {
    result = tryCompile(entry)

    if (noDepth) {
      moduleState.stat = null
    }
  } else {
    try {
      result = tryCompile(entry)
    } catch (e) {
      if (! isError(e) ||
          isStackTraceMasked(e)) {
        throw e
      }

      const { filename } = entry.module
      const content = () => readSourceCode(filename)

      throw maskStackTrace(e, content, filename, isESM)
    } finally {
      if (noDepth) {
        moduleState.stat = null
      }
    }
  }

  return result
}

function tryCompileCJS(entry) {
  const cached = entry.package.cache.compile[entry.cacheName]
  const isAsync = useAsyncWrapper(entry)
  const mod = entry.module

  let content = cached.code

  if (cached.changed) {
    const async = isAsync ? "async " :  ""

    content =
      (cached.topLevelReturn ? "return " : "") +
      "this.r((" + async + "function(" + entry.runtimeName + ",global,exports,require){" +
      content +
      "\n}))"

    Runtime.enable(entry, new ExObject)
  } else if (isAsync) {
    Module.wrap = moduleWrapAsyncCJS
  }

  content += maybeSourceMap(entry, content)

  try {
    return mod._compile(content, mod.filename)
  } finally {
    if (Module.wrap === moduleWrapAsyncCJS) {
      Module.wrap = wrap
    }
  }
}

function tryCompileESM(entry) {
  const async = useAsyncWrapper(entry) ? "async " :  ""
  const { module:mod, package:pkg } = entry
  const cached = pkg.cache.compile[entry.cacheName]
  const { filename } = mod
  const { options } = pkg

  let content =
    (cached.topLevelReturn ? "return " : "") +
    "this.r((" + async + "function(" + entry.runtimeName + ",global" +
    (options.cjs.vars ? ",exports,require" : "") +
    '){"use strict";' +
    cached.code +
    "\n}))"

  content += maybeSourceMap(entry, content)

  if (! entry.url) {
    entry.url = getURLFromFilePath(filename)
  }

  if (! options.cjs.vars) {
    Module.wrap = moduleWrapESM
  }

  Runtime.enable(entry, new ExObject)

  try {
    return mod._compile(content, filename)
  } finally {
    if (Module.wrap === moduleWrapESM) {
      Module.wrap = wrap
    }
  }
}

function moduleWrapAsyncCJS(script) {
  Module.wrap = wrap
  return "(async function (exports, require, module, __filename, __dirname) { " +
    script + "\n});"
}

function moduleWrapESM(script) {
  Module.wrap = wrap
  return "(function () { " + script + "\n});"
}

function maybeSourceMap(entry, content) {
  const { sourceMap } = entry.package.options

  if (sourceMap !== false &&
     (sourceMap || isInspect()) &&
      ! getSourceMappingURL(content)) {
    return "//# sourceMappingURL=data:application/json;charset=utf-8," +
      encodeURI(createSourceMap(entry.module.filename, content))
  }

  return ""
}

function readCachedCode(filename) {
  return readFileFast(filename, "utf8")
}

function readSourceCode(filename) {
  return readFile(filename, "utf8")
}

function tryCompileCode(caller, entry, content, options) {
  if (entry.package.options.debug) {
    return Compiler.compile(entry, content, options)
  }

  try {
    return Compiler.compile(entry, content, options)
  } catch (e) {
    if (! isError(e) ||
        isStackTraceMasked(e)) {
      throw e
    }

    const isESM = e.sourceType === "module"

    Reflect.deleteProperty(e, "sourceType")
    captureStackTrace(e, caller)
    throw maskStackTrace(e, content, entry.module.filename, isESM)
  }
}

function tryValidateESM(caller, entry) {
  const { options } = entry.package

  if (options.debug) {
    validateESM(entry)
  } else {
    try {
      validateESM(entry)
    } catch (e) {
      if (! isError(e) ||
          isStackTraceMasked(e)) {
        throw e
      }

      const { filename } = entry.module
      const content = () => readSourceCode(filename)

      captureStackTrace(e, caller)
      throw maskStackTrace(e, content, filename, true)
    }
  }
}

function useAsyncWrapper(entry) {
  const pkg = entry.package

  if (pkg.options.await &&
      shared.support.await) {
    const cached = pkg.cache.compile[entry.cacheName]
    const isESM = cached && cached.esm

    if (! isESM) {
      return true
    }

    const { exportSpecifiers } = cached

    if (! exportSpecifiers ||
        ! keys(exportSpecifiers).length) {
      return true
    }
  }

  return false
}

export default compile
