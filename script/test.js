"use strict"

const execa = require("execa")
const fs = require("fs-extra")
const ignorePaths = require("./ignore-paths.js")
const path = require("path")
const trash = require("./trash.js")

const argv = require("yargs")
  .boolean("prod")
  .argv

const isWin = process.platform === "win32"

const rootPath = path.resolve(__dirname, "..")
const testPath = path.resolve(rootPath, "test")

const buildPath = path.resolve(rootPath, "build")
const envPath = path.resolve(testPath, "env")
const gzipPath = path.resolve(rootPath, "esm.js.gz")
const mochaPath = path.resolve(rootPath, "node_modules/mocha/bin/_mocha")
const nodePath = path.resolve(envPath, "prefix", isWin ? "node.exe" : "bin/node")
const nodeModulesPath = path.resolve(rootPath, "node_modules")
const vendorPath = path.resolve(rootPath, "src/vendor")

const trashPaths = ignorePaths
  .filter((thePath) =>
    thePath !== gzipPath &&
    thePath !== nodeModulesPath &&
    ! thePath.startsWith(buildPath) &&
    ! thePath.startsWith(vendorPath)
  )

const HOME = path.resolve(envPath, "home")

const NODE_ENV =
  (argv.prod ? "production" : "development") +
  "-test"

const NODE_PATH = [
  path.resolve(envPath, "node_path"),
  path.resolve(envPath, "node_path/relative")
].join(path.delimiter)

const nodeArgs = []

if (process.env.HARMONY) {
  nodeArgs.push("--harmony")
}

nodeArgs.push(
  mochaPath,
  "--full-trace",
  "--require", "../index.js",
  "tests.mjs"
)

function cleanRepo() {
  return Promise.all(trashPaths.map(trash))
}

function runTests(cached) {
  return execa(nodePath, nodeArgs, {
    cwd: testPath,
    env: {
      HOME,
      NODE_ENV: NODE_ENV + (cached ? "-cached" : ""),
      NODE_PATH,
      USERPROFILE: HOME
    },
    stdio: "inherit"
  })
  .catch((e) => process.exit(e.code))
}

function setupNode() {
  const basePath = path.resolve(nodePath, isWin ? "" : "..")
  return trash(basePath)
    .then(() => fs.ensureLink(process.execPath, nodePath))
}

Promise
  .all([
    cleanRepo(),
    setupNode()
  ])
  .then(() => runTests())
  .then(() => runTests(true))
