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
import isInspectorEnabled from "../env/is-inspector-enabled.js"
import isStackTraceMasked from "../util/is-stack-trace-masked.js"
import maskStackTrace from "../error/mask-stack-trace.js"
import moduleState from "./state.js"
import readFile from "../fs/read-file.js"
import readFileFast from "../fs/read-file-fast.js"
import { satisfies } from "semver"
import validateESM from "./esm/validate.js"
import warn from "../warn.js"
import wrap from "./wrap.js"

let allowTopLevelAwait = satisfies(process.version, ">=7.6.0")

function compile(entry, content, filePath) {
  const { options } = entry.package
  const ext = extname(filePath)

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
  const { cacheFileName } = entry

  let cached = cache[cacheFileName]

  if (cached === true) {
    const code = readCachedCode(resolve(cachePath, cacheFileName), options)

    cached =
    cache[cacheFileName] = Compiler.from(code)
  } else if (! cached) {
    cached = tryCompileCode(entry, content, {
      hint,
      type
    })
  }

  const { warnings } = cached

  if (options.warnings &&
      moduleState.parsing &&
      warnings) {
    for (const warning of warnings) {
      warn(warning.code, filePath, ...warning.args)
    }
  }

  if (! entry.url) {
    entry.url = getURLFromFilePath(filePath)
  }

  if (moduleState.parsing) {
    const cached = entry.package.cache[entry.cacheFileName]
    const defaultPkg = Package.default
    const isESM = cached && cached.esm
    const { parent } = entry
    const parentCached = parent && parent.package.cache[parent.cacheFileName]
    const parentIsESM = parentCached && parentCached.esm

    if (! isESM &&
        ! parentIsESM &&
        (pkg === defaultPkg ||
         (entry.parent &&
          entry.parent.package === defaultPkg))) {
      return false
    } else if (isESM &&
        entry.state === 1) {
      tryValidateESM(entry)
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
  const cached = entry.package.cache[entry.cacheFileName]
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

      const { filePath } = entry
      const sourceCode = () => readSourceCode(filePath, options)
      throw maskStackTrace(e, sourceCode, filePath, isESM)
    }
  }

  if (noDepth) {
    moduleState.stat = null
  }
}

function tryCompileCJS(entry) {
  const async = useAsyncWrapper(entry) ? "async " :  ""
  const { runtimeName } = entry
  const { code } = entry.package.cache[entry.cacheFileName]

  let content =
    "const " + runtimeName + "=this;" +
    runtimeName + ".r((" + async + "function(global,exports,require){" +
    code + "\n}))"

  content += maybeSourceMap(entry, content)

  const exported = {}

  if (Module.wrap === moduleWrapESM) {
    Module.wrap = wrap
  }

  Runtime.enable(entry, exported)
  entry.module._compile(content, entry.filePath)
}

function tryCompileESM(entry) {
  const async = useAsyncWrapper(entry) ? "async " :  ""
  const { runtimeName } = entry
  const { code } = entry.package.cache[entry.cacheFileName]
  const { options } = entry.package

  let content =
    '"use strict";const ' + runtimeName + "=this;" +
    runtimeName + ".r((" + async + "function(global" +
    (options.cjs.vars ? ",exports,require" : "") +
    "){" + code + "\n}))"

  content += maybeSourceMap(entry, content)

  const exported = {}

  if (! options.cjs.vars) {
    Module.wrap = moduleWrapESM
  }

  Runtime.enable(entry, exported)

  try {
    entry.module._compile(content, entry.filePath)
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
     (sourceMap || isInspectorEnabled()) &&
      ! getSourceMappingURL(content)) {
    return "//# sourceMappingURL=data:application/json;charset=utf-8," +
      encodeURI(createSourceMap(entry.filePath, content))
  }

  return ""
}

function readCachedCode(filePath, options) {
  if (options && options.gz &&
      _extname(filePath) === ".gz") {
    return gunzip(readFile(filePath), "utf8")
  }

  return readFileFast(filePath, "utf8")
}

function readSourceCode(filePath, options) {
  if (options && options.gz &&
      _extname(filePath) === ".gz") {
    return gunzip(readFile(filePath), "utf8")
  }

  return readFile(filePath, "utf8")
}

function tryCompileCode(entry, content, options) {
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
    // captureStackTrace(e, manager)
    throw maskStackTrace(e, content, entry.filePath, isESM)
  }
}

function tryValidateESM(entry) {
  const { filePath } = entry
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

      const content = () => readSourceCode(filePath, options)
      // captureStackTrace(e, manager)
      throw maskStackTrace(e, content, filePath, true)
    }
  }
}

function useAsyncWrapper(entry) {
  const { mainModule } = moduleState

  if (allowTopLevelAwait &&
      mainModule &&
      entry.package.options.await) {
    const mod = entry.module
    allowTopLevelAwait = false

    if (mainModule === mod ||
        mainModule.children.some((child) => child === mod)) {
      return true
    }
  }

  return false
}

export default compile
