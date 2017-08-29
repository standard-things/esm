import { dirname, join } from "path"

import FastObject from "./fast-object.js"
import PkgInfo from "./pkg-info.js"

import realpath from "./fs/realpath.js"
import resolveFilename from "./module/resolve-filename.js"
import rootModule from "./root-module.js"

const { _preloadModules, argv } = process
const { filename:esmPath, parent } = __non_webpack_module__

const indexPath = join(esmPath, "../index.js")
const parentFilename = parent && parent.filename

let mainPath = ""
let pkgPath = ""

if (argv.length > 1) {
  mainPath = resolveFilename(argv[1], rootModule)

  if (dirname(argv[1])
        .replace(/\\/g, "/")
        .endsWith("/node_modules/.bin")) {
    pkgPath = realpath(join(argv[1], "../../../"))
  }
}

function hasLoaderModule(children) {
  return Array.isArray(children) &&
    children.some(({ filename }) => filename === esmPath)
}

function hasLoaderPath(strings) {
  return strings.some((string) => resolveFilename(string, rootModule) === indexPath)
}

const env = new FastObject

env.preload =
  rootModule.id === "internal/preload" ||
  hasLoaderModule(_preloadModules)

env.repl =
  (env.preload && argv.length < 2) ||
  (rootModule.filename === null &&
  rootModule.id === "<repl>" &&
  rootModule.loaded === false &&
  rootModule.parent === void 0 &&
  hasLoaderModule(rootModule.children))

env.cli =
  ! env.preload &&
  ! env.repl &&
  argv.length > 2 &&
  hasLoaderPath(argv.slice(2)) &&
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
