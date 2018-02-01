import { extname as _extname, resolve } from "path"

import Compiler from "../caching-compiler.js"
import Module from "../module.js"
import NullObject from "../null-object.js"
import Package from "../package.js"
import Runtime from "../runtime.js"

import captureStackTrace from "../error/capture-stack-trace.js"
import createSourceMap from "../util/create-source-map.js"
import encodeURI from "../util/encode-uri.js"
import extname from "../path/extname.js"
import getSourceMappingURL from "../util/get-source-mapping-url.js"
import getURLFromFilePath from "../util/get-url-from-file-path.js"
import gunzip from "../fs/gunzip.js"
import isInspect from "../env/is-inspect.js"
import isStackTraceMasked from "../util/is-stack-trace-masked.js"
import maskStackTrace from "../error/mask-stack-trace.js"
import moduleState from "./state.js"
import readFile from "../fs/read-file.js"
import readFileFast from "../fs/read-file-fast.js"
import { satisfies } from "semver"
import validateESM from "./esm/validate.js"
import warn from "../warn.js"
import wrap from "./wrap.js"

const useTopLevelAwait = satisfies(process.version, ">=7.6.0")

const { keys } = Object

function compile(caller, entry, content, filename) {
  const { options } = entry.package
  const ext = extname(filename)

  let hint = "script"
  let type = "script"

  if (options.esm === "all") {
    type = "module"
  } else if (options.esm === "js") {
    type = "unambiguous"
  }

  if (ext === ".mjs" ||
      ext === ".mjs.gz") {
    hint = "module"

    if (type === "script") {
      type = "module"
    }
  }

  const pkg = entry.package
  const { cache, cachePath } = pkg
  const { cacheName } = entry

  let cached = cache[cacheName]

  if (cached === true) {
    cached = Compiler.from(entry)

    if (cached) {
      cached.code = readCachedCode(resolve(cachePath, cacheName), options)
      cache[cacheName] = cached
    }
  }

  if (! cached) {
    if (content === "") {
      content = readSourceCode(filename, options)
    }

    cached =
    cache[cacheName] = tryCompileCode(caller, entry, content, { hint, type })
  }

  const { warnings } = cached

  if (options.warnings &&
      moduleState.parsing &&
      warnings) {
    for (const warning of warnings) {
      warn(warning.code, filename, ...warning.args)
    }
  }

  if (! entry.url) {
    entry.url = getURLFromFilePath(filename)
  }

  if (moduleState.parsing) {
    const cached = entry.package.cache[entry.cacheName]
    const defaultPkg = Package.default
    const isESM = cached && cached.esm
    const { parent } = entry
    const parentCached = parent && parent.package.cache[parent.cacheName]
    const parentIsESM = parentCached && parentCached.esm

    if (! isESM &&
        ! parentIsESM &&
        (pkg === defaultPkg ||
         (entry.parent &&
          entry.parent.package === defaultPkg))) {
      return false
    } else if (isESM &&
        entry.state === 1) {
      tryValidateESM(caller, entry)
    }
  } else {
    entry.state = 3
    tryCompileCached(entry)
  }

  return true
}

function tryCompileCached(entry) {
  const noDepth = moduleState.requireDepth === 0
  const { options } = entry.package
  const cached = entry.package.cache[entry.cacheName]
  const isESM = cached && cached.esm
  const tryCompile = isESM ? tryCompileESM : tryCompileCJS

  if (noDepth) {
    moduleState.stat = new NullObject
  }

  if (options.debug) {
    tryCompile(entry)
  } else {
    try {
      tryCompile(entry)
    } catch (e) {
      if (isStackTraceMasked(e)) {
        throw e
      }

      const { filename } = entry.module
      const content = () => readSourceCode(filename, options)

      throw maskStackTrace(e, content, filename, isESM)
    }
  }

  if (noDepth) {
    moduleState.stat = null
  }
}

function tryCompileCJS(entry) {
  const async = useAsyncWrapper(entry) ? "async " :  ""
  const { module:mod, runtimeName } = entry

  let content =
    "const " + runtimeName + "=this;" +
    runtimeName + ".r((" + async + "function(global,exports,require){" +
    entry.package.cache[entry.cacheName].code +
    "\n}))"

  content += maybeSourceMap(entry, content)

  const exported = {}

  if (Module.wrap === moduleWrapESM) {
    Module.wrap = wrap
  }

  Runtime.enable(entry, exported)
  mod._compile(content, mod.filename)
}

function tryCompileESM(entry) {
  const async = useAsyncWrapper(entry) ? "async " :  ""
  const { module:mod, runtimeName } = entry
  const { options } = entry.package

  let content =
    '"use strict";const ' + runtimeName + "=this;" +
    runtimeName + ".r((" + async + "function(global" +
    (options.cjs.vars ? ",exports,require" : "") +
    "){" + entry.package.cache[entry.cacheName].code + "\n}))"

  content += maybeSourceMap(entry, content)

  const exported = {}

  if (! options.cjs.vars) {
    Module.wrap = moduleWrapESM
  }

  Runtime.enable(entry, exported)

  try {
    mod._compile(content, mod.filename)
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

function readCachedCode(filename, options) {
  if (options && options.gz &&
      _extname(filename) === ".gz") {
    return gunzip(readFile(filename), "utf8")
  }

  return readFileFast(filename, "utf8")
}

function readSourceCode(filename, options) {
  if (options && options.gz &&
      _extname(filename) === ".gz") {
    return gunzip(readFile(filename), "utf8")
  }

  return readFile(filename, "utf8")
}

function tryCompileCode(caller, entry, content, options) {
  if (entry.package.options.debug) {
    return Compiler.compile(entry, content, options)
  }

  try {
    return Compiler.compile(entry, content, options)
  } catch (e) {
    if (isStackTraceMasked(e)) {
      throw e
    }

    const isESM = e.sourceType === "module"

    delete e.sourceType
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
      if (isStackTraceMasked(e)) {
        throw e
      }

      const { filename } = entry.module
      const content = () => readSourceCode(filename, options)

      captureStackTrace(e, caller)
      throw maskStackTrace(e, content, filename, true)
    }
  }
}

function useAsyncWrapper(entry) {
  if (useTopLevelAwait &&
      entry.package.options.await) {
    const cached = entry.package.cache[entry.cacheName]
    const exportSpecifiers = cached && cached.exportSpecifiers

    if (! exportSpecifiers ||
        ! keys(exportSpecifiers).length) {
      return true
    }
  }

  return false
}

export default compile
