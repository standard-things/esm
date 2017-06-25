import esmSemVer from "./version.js"
import FastObject from "./fast-object.js"

// Map absolute file paths to the package info that governs them.
const pkgInfo = new FastObject

// Enable in-memory caching when compiling without a file path.
pkgInfo[""] = {
  cache: Object.create(null),
  cachePath: null,
  config: Object.create(null),
  range: esmSemVer.version
}

export { pkgInfo }
