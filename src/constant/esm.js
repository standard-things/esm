import encodeId from "../util/encode-id.js"
import setDeferred from "../util/set-deferred.js"
import stripPrereleaseTag from "../util/strip-prerelease-tag.js"

// The `process.env` properties are replaced at build time.
// https://webpack.js.org/plugins/environment-plugin/
const { PACKAGE_FILENAMES } = process.env
const { PACKAGE_VERSION } = process.env

const ESM = {
  PACKAGE_DIRNAME: null,
  PACKAGE_FILENAMES: null,
  PACKAGE_PREFIX: encodeId("esm"),
  PACKAGE_RANGE: stripPrereleaseTag(PACKAGE_VERSION),
  PACKAGE_VERSION
}

const { filename } = __non_webpack_module__

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

export default ESM
