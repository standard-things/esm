/* eslint strict: off, node/no-unsupported-features: ["error", { version: 4 }] */
"use strict"

const execa = require("execa")
const fs = require("fs-extra")
const globby = require("globby")
const path = require("path")
const trash = require("./trash.js")

const argv = require("yargs")
  .boolean("prod")
  .argv

const isWin = process.platform === "win32"

const rootPath = path.resolve(__dirname, "..")
const testPath = path.resolve(rootPath, "test")
const envPath = path.resolve(testPath, "env")

const HOME = path.resolve(envPath, "home")
const MOCHA_BIN = path.resolve(rootPath, "node_modules/mocha/bin/mocha")
const NODE_BIN = path.resolve(envPath, "prefix", isWin ? "node.exe" : "bin/node")

const NODE_ENV =
  (argv.prod ? "production" : "development") +
  "-test"

const NODE_PATH = [
  path.resolve(envPath, "node_path"),
  path.resolve(envPath, "node_path/relative")
].join(path.delimiter)

const trashPaths = globby.sync([
  "**/.cache",
  "**/.nyc_output",
  "test/**/*.gz",
  "test/node_modules/**/node_modules",
  "test/node_modules/**/package-lock.json",
  "test/node_modules/nyc-typescript-esm/**/*.js"
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

if (process.env.HARMONY) {
  mochaArgs.push("--harmony")
}

function cleanRepo() {
  return Promise.all(trashPaths.map(trash))
}

function runTests(cached) {
  return execa(NODE_BIN, mochaArgs, {
    cwd: testPath,
    env: {
      HOME,
      NODE_ENV: NODE_ENV + (cached ? "cached" : ""),
      NODE_PATH,
      USERPROFILE: HOME
    },
    stdio: "inherit"
  })
  .catch((e) => {
    process.exitCode = e.code
  })
}

function setupNode() {
  const basePath = path.resolve(NODE_BIN, isWin ? "" : "..")
  return trash(basePath)
    .then(() => fs.ensureLink(process.execPath, NODE_BIN))
}

Promise
  .all([
    cleanRepo(),
    setupNode()
  ])
  .then(() => runTests())
  .then(() => runTests(true))
