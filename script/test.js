import { ensureLink } from "fs-extra"
import execa from "execa"
import globby from "globby"
import { join } from "path"
import { satisfies } from "semver"
import trash from "trash"

const NODE_ENV = String(process.env.NODE_ENV)

const isProd = NODE_ENV.startsWith("production")
const isWin = process.platform === "win32"

const rootPath = join(__dirname, "..")
const testPath = join(rootPath, "test")
const envPath = join(testPath, "env")
const esmPath = isProd ? "../index.js" : "../build/esm.js"

const BABEL_DISABLE_CACHE = true
const HOME = join(envPath, "home")
const MOCHA_BIN = join(rootPath, "node_modules/mocha/bin/mocha")
const NODE_BIN = join(envPath, "prefix", isWin ? "node.exe" : "bin/node")
const NODE_PATH = join(envPath, "node_path")

const trashPaths = globby.sync([
  "**/.?(esm-)cache",
  "test/**/*.gz",
  "test/env/prefix/bin",
  "test/env/prefix/node"
], {
  cwd: rootPath,
  realpath: true
})

const mochaArgs = [
  MOCHA_BIN,
  "--full-trace",
  "--require", esmPath,
  "tests.js"
]

if (satisfies(process.version, "<6")) {
  mochaArgs.splice(mochaArgs.length - 1, 0, "--compilers", "js:babel-register")
}

function runTests() {
  return execa(NODE_BIN, mochaArgs, {
    cwd: testPath,
    env: { BABEL_DISABLE_CACHE, HOME, NODE_PATH },
    stdio: "inherit"
  })
  .catch((e) => process.exit(e.code))
}

/* eslint lines-around-comment: off */
Promise
  // Clear cache folders for first run.
  .all(trashPaths.map(trash))
  // Create Node symlink.
  .then(() => ensureLink(process.execPath, NODE_BIN))
  // Run tests again using the cache.
  .then(runTests)
  .then(runTests)
