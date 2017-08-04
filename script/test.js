import execa from "execa"
import fs from "fs-extra"
import globby from "globby"
import path from "path"
import trash from "trash"

const NODE_ENV = String(process.env.NODE_ENV)
const isProduction = NODE_ENV.startsWith("production")
const isWindows = process.platform === "win32"

const rootPath = path.join(__dirname, "..")
const testPath = path.join(rootPath, "test")
const envPath = path.join(testPath, "env")
const esmPath = isProduction ? "../index.js" : "../build/esm.js"

const HOME = path.join(envPath, "home")
const MOCHA_BIN = path.join(rootPath, "node_modules/.bin/mocha")
const NODE_BIN = path.join(envPath, "prefix", isWindows ? "" : "bin", "node")
const NODE_PATH = path.join(envPath, "node_path")

const trashPaths = globby.sync([
  "**/.?(esm-)cache",
  "test/**/*.gz",
  "test/env/prefix/bin",
  "test/env/prefix/node"
], {
  cwd: rootPath,
  realpath: true
})

function runTests() {
  return execa(NODE_BIN, [
    MOCHA_BIN,
    "--full-trace",
    "--require", esmPath,
    "tests.js"
  ], {
    cwd: testPath,
    env: { HOME, NODE_PATH },
    stdio: "inherit"
  })
  .catch((e) => process.exit(e.code))
}

/* eslint lines-around-comment: off */
Promise
  // Clear cache folders for first run.
  .all(trashPaths.map(trash))
  // Create Node symlink.
  .then(() => fs.ensureLink(process.execPath, NODE_BIN))
  // Run tests again using the cache.
  .then(runTests)
  .then(runTests)
