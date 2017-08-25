import FastObject from "./fast-object.js"

import rootModule from "./root-module.js"

const { _preloadModules, argv } = process
const { filename, parent } = __non_webpack_module__

const mainPath = argv[1]
const parentFilename = parent && parent.filename

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

env.mocha =
  ! env.preload &&
  ! env.repl &&
  argv.length > 4 &&
  mainPath === rootModule.filename &&
  mainPath === parentFilename &&
  mainPath.includes("mocha") &&
  (argv.indexOf("-r") > 1 || argv.indexOf("--require") > 1)

export default env
