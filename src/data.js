import esmSemVer from "./version.js"
import FastObject from "./fast-object.js"
import PkgInfo from "./pkg-info.js"

// Map absolute file paths to the package info that governs them.
const pkgInfo = new FastObject

// Enable in-memory caching when compiling without a file path.
pkgInfo[""] = new PkgInfo("", esmSemVer.version, {
  "cache-directory": false
})

export default { pkgInfo }
