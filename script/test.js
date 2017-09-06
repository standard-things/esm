import { delimiter, join } from "path"

import { ensureLink } from "fs-extra"
import execa from "execa"
import globby from "globby"
import trash from "./trash.js"
import yargs from "yargs"

const argv = yargs
  .boolean("prod")
  .argv

const isWin = process.platform === "win32"

const rootPath = join(__dirname, "..")
const testPath = join(rootPath, "test")
const envPath = join(testPath, "env")

const HOME = join(envPath, "home")
const MOCHA_BIN = join(rootPath, "node_modules/mocha/bin/mocha")
const NODE_BIN = join(envPath, "prefix", isWin ? "node.exe" : "bin/node")

const NODE_ENV =
  (argv.prod ? "production" : "development") +
  "-test"

const NODE_PATH = [
  join(envPath, "node_path"),
  join(envPath, "node_path/relative")
].join(delimiter)

const trashPaths = globby.sync([
  "**/.?(esm-)cache",
  "test/**/*.gz"
], {
  cwd: rootPath,
  realpath: true
})

const mochaArgs = [
  MOCHA_BIN,
  "--full-trace",
  "--require", "../index.js",
  "tests.mjs"
]

function cleanRepo() {
  return Promise.all(trashPaths.map(trash))
}

function runTests() {
  return execa(NODE_BIN, mochaArgs, {
    cwd: testPath,
    env: { HOME, NODE_ENV, NODE_PATH, USERPROFILE: HOME },
    reject: false,
    stdio: "inherit"
  })
}

function setupNode() {
  const basePath = join(NODE_BIN, isWin ? "" : "..")
  return trash(basePath)
    .then(() => ensureLink(process.execPath, NODE_BIN))
}

/* eslint-disable lines-around-comment */
Promise
  .all([
    cleanRepo(),
    setupNode()
  ])
  // Run tests without the cache.
  .then(runTests)
  // Run tests with the cache.
  .then(runTests)
