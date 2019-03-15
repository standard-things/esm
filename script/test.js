"use strict"

const SemVer = require("semver")

const execa = require("execa")
const fs = require("fs-extra")
const ignorePaths = require("./ignore-paths.js")
const path = require("path")
const setupTest262 = require("./setup-test262.js")
const terser = require("terser").minify
const trash = require("./trash.js")

const argv = require("yargs")
  .boolean("prod")
  .argv

const isWin = process.platform === "win32"

const rootPath = path.resolve(__dirname, "..")
const testPath = path.resolve(rootPath, "test")
const envPath = path.resolve(testPath, "env")
const esmPath = path.resolve(rootPath, "esm.js")
const fixturePath = path.resolve(testPath, "fixture")
const indexPath = path.resolve(rootPath, "index.js")
const mochaPath = path.resolve(rootPath, "node_modules/mocha/bin/_mocha")
const nodePath = path.resolve(envPath, "prefix", isWin ? "node.exe" : "bin/node")

const NODE_ENV = argv.prod ? "production" : "development"
const ESM_ENV = NODE_ENV + "-test"
const HOME = path.resolve(envPath, "home")

const NODE_PATH = [
  path.resolve(envPath, "node_path"),
  path.resolve(envPath, "node_path/relative")
].join(path.delimiter)

const jsPaths = [
  esmPath,
  indexPath
]

const keptPaths = [
  path.resolve(rootPath, "build"),
  path.resolve(rootPath, "esm"),
  path.resolve(rootPath, "node_modules"),
  path.resolve(rootPath, "src/vendor"),
  path.resolve(rootPath, "test/vendor")
]

const nodeArgs = []

if (SemVer.satisfies(process.version, ">=10.5")) {
  nodeArgs.push("--experimental-worker")
}

if (process.env.HARMONY) {
  nodeArgs.push("--harmony")
}

nodeArgs.push(
  mochaPath,
  "--full-trace",
  "--require", "../index.js",
  "tests.js"
)

const terserOptions = fs.readJSONSync(path.resolve(rootPath, ".terserrc"))
const trashPaths = ignorePaths.filter(isKept)

function cleanJS() {
  for (const filename of jsPaths) {
    const content = fs.readFileSync(filename, "utf8")

    process.once("exit", () => fs.outputFileSync(filename, content))

    fs.outputFileSync(filename, minifyJS(content))
  }
}

function isKept(thePath) {
  return thePath.endsWith(".cache") ||
         keptPaths.every((dirname) => ! thePath.startsWith(dirname))
}

function minifyJS(content) {
  return terser(content, terserOptions).code
}

function runTests(cached) {
  return execa(nodePath, nodeArgs, {
    cwd: testPath,
    env: {
      ESM_ENV: ESM_ENV + (cached ? "-cached" : ""),
      ESM_OPTIONS: "{cjs:false,mode:'auto'}",
      HOME,
      NODE_ENV,
      NODE_OPTIONS: "--trace-warnings",
      NODE_PATH,
      NODE_PENDING_DEPRECATION: 1,
      USERPROFILE: HOME
    },
    stdio: "inherit"
  })
  .catch((e) => {
    console.error(e)
    process.exit(e.code)
  })
}

function setupNode() {
  const basePath = path.resolve(nodePath, isWin ? "" : "..")

  return trash(basePath)
    .then(() => fs.ensureLink(process.execPath, nodePath))
}

function setupRepo() {
  return Promise
    .all(trashPaths.map(trash))
    .then(() => {
      if (! isWin) {
        const safeCharactersPath = path.resolve(fixturePath, "safe-characters[#%&;=].mjs")
        const unsafeCharactersPath = path.resolve(fixturePath, "unsafe-characters[\b\t\n\r:?].mjs")

        if (! fs.existsSync(unsafeCharactersPath)) {
          fs.copySync(safeCharactersPath, unsafeCharactersPath)
        }
      }
    })
}

Promise
  .all([
    argv.prod && cleanJS(),
    setupRepo(),
    setupNode(),
    setupTest262()
  ])
  .then(() => runTests())
  .then(() => runTests(true))
