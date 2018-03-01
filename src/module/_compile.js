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
  const ext = extname(filename)

  let hint = "script"
  let type = "script"

  if (options.esm === "all") {
    type = "module"
  } else if (options.esm === "js") {
    type = "unambiguous"
  }

  if (ext === ".mjs") {
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

  if (! entry.url) {
    entry.url = getURLFromFilePath(filename)
  }

  if (moduleState.parsing) {
    const cached = entry.package.cache.compile[entry.cacheName]
    const defaultPkg = shared.package.default
    const isESM = cached && cached.esm
    const { parent } = entry
    const parentCached = parent && parent.package.cache.compile[parent.cacheName]
    const parentIsESM = parentCached && parentCached.esm

    if (! isESM &&
        ! parentIsESM &&
        (pkg === defaultPkg ||
         (entry.parent &&
          entry.parent.package === defaultPkg))) {
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
  const noDepth = moduleState.requireDepth === 0
  const { options } = entry.package
  const cached = entry.package.cache.compile[entry.cacheName]
  const isESM = cached && cached.esm
  const tryCompile = isESM ? tryCompileESM : tryCompileCJS

  if (noDepth) {
    moduleState.stat = { __proto__: null }
  }

  let result

  if (options.debug) {
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
      const content = () => readSourceCode(filename, options)

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
  const async = useAsyncWrapper(entry) ? "async " :  ""
  const { module:mod, runtimeName } = entry

  let content =
    "const " + runtimeName + "=this;" +
    "return " + runtimeName + ".r((" + async + "function(global,exports,require){" +
    entry.package.cache.compile[entry.cacheName].code +
    "\n}))"

  content += maybeSourceMap(entry, content)

  const exported = new ExObject

  if (Module.wrap === moduleWrapESM) {
    Module.wrap = wrap
  }

  Runtime.enable(entry, exported)
  return mod._compile(content, mod.filename)
}

function tryCompileESM(entry) {
  const async = useAsyncWrapper(entry) ? "async " :  ""
  const { module:mod, runtimeName } = entry
  const { options } = entry.package

  let content =
    '"use strict";const ' + runtimeName + "=this;" +
    "return " + runtimeName + ".r((" + async + "function(global" +
    (options.cjs.vars ? ",exports,require" : "") +
    "){" + entry.package.cache.compile[entry.cacheName].code + "\n}))"

  content += maybeSourceMap(entry, content)

  const exported = new ExObject

  if (! options.cjs.vars) {
    Module.wrap = moduleWrapESM
  }

  Runtime.enable(entry, exported)

  try {
    return mod._compile(content, mod.filename)
  } finally {
    if (Module.wrap === moduleWrapESM) {
      Module.wrap = wrap
    }
  }
}

function moduleWrapESM(script) {
  Module.wrap = wrap
  return "(function(){" + script + "\n})"
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
  if (entry.package.options.await &&
      shared.support.await) {
    const cached = entry.package.cache.compile[entry.cacheName]
    const exportSpecifiers = cached && cached.exportSpecifiers

    if (! exportSpecifiers ||
        ! keys(exportSpecifiers).length) {
      return true
    }
  }

  return false
}

export default compile
