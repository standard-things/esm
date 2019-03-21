import encodeId from "../util/encode-id.js"
import setDeferred from "../util/set-deferred.js"

// The `process.env` properties are replaced at build time.
// https://webpack.js.org/plugins/environment-plugin/
const { PACKAGE_FILENAMES } = process.env
const { PACKAGE_VERSION } = process.env

const ESM = {
  PACKAGE_DIRNAME: null,
  PACKAGE_FILENAMES: null,
  PACKAGE_PREFIX: encodeId("esm"),
  PACKAGE_RANGE: PACKAGE_VERSION.match(/^[\d.]+/)[0],
  PACKAGE_VERSION,
  STACK_TRACE_LIMIT: 30
}

const { filename, parent } = __non_webpack_module__
const parentFilename = parent != null && parent.filename

setDeferred(ESM, "PACKAGE_DIRNAME", () => {
  const { safePath } = __shared__.module

  return safePath.dirname(filename)
})

setDeferred(ESM, "PACKAGE_FILENAMES", function () {
  const { safePath } = __shared__.module
  const { sep } = safePath
  const { PACKAGE_DIRNAME } = this

  let { length } = PACKAGE_FILENAMES

  while (length--) {
    PACKAGE_FILENAMES[length] = PACKAGE_DIRNAME + sep + PACKAGE_FILENAMES[length]
  }

  return PACKAGE_FILENAMES
})

setDeferred(ESM, "PACKAGE_PARENT_NAME", () => {
  const { safePath } = __shared__.module
  const { sep } = safePath

  const nodeModulesIndex = typeof parentFilename === "string"
    ? parentFilename.lastIndexOf(sep + "node_modules" + sep)
    : -1

  if (nodeModulesIndex === -1) {
    return ""
  }

  const start = nodeModulesIndex + 14
  const end = parentFilename.indexOf(sep, start)

  return end === -1
    ? ""
    : parentFilename.slice(start, end)
})

export default ESM
