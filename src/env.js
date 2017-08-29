import { dirname, join } from "path"

import FastObject from "./fast-object.js"
import PkgInfo from "./pkg-info.js"

import resolveFilename from "./module/resolve-filename.js"
import rootModule from "./root-module.js"

const { _preloadModules, argv } = process
const { filename, parent } = __non_webpack_module__
const parentFilename = parent && parent.filename

let mainPath = ""
let pkgPath = ""

if (argv.length > 1) {
  mainPath = resolveFilename(argv[1])

  if (dirname(argv[1])
        .replace(/\\/g, "/")
        .endsWith("/node_modules/.bin")) {
    pkgPath = resolveFilename(join(argv[1], "../../../"))
  }
}

const includes = {
  "@std/esm"(array) {
    return Array.isArray(array) &&
      array.some((mod) => mod.filename === filename)
  }
}

const env = new FastObject

env.preload =
  rootModule.id === "internal/preload" ||
  includes["@std/esm"](_preloadModules)

env.repl =
  (env.preload && argv.length < 2) ||
  (rootModule.filename === null &&
  rootModule.id === "<repl>" &&
  rootModule.loaded === false &&
  rootModule.parent === void 0 &&
  includes["@std/esm"](rootModule.children))

env.cli =
  ! env.preload &&
  ! env.repl &&
  argv.length > 2 &&
  argv.indexOf("@std/esm") > 1 &&
  !! pkgPath && PkgInfo.get(pkgPath) !== null

env.mocha =
  ! env.preload &&
  ! env.repl &&
  argv.length > 4 &&
  mainPath === rootModule.filename &&
  mainPath === parentFilename &&
  mainPath.includes("mocha") &&
  (argv.indexOf("-r") > 1 || argv.indexOf("--require") > 1)

export default env
