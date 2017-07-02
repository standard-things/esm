import execa from "execa"
import globby from "globby"
import path from "path"
import trash from "trash"

const rootPath = path.join(__dirname, "..")
const testPath = path.join(rootPath, "test")
const envPath = path.join(testPath, "env")

const HOME = path.join(envPath, "home")
const NODE_ENV = String(process.env.NODE_ENV)
const NODE_PATH = path.join(envPath, "node_path")
const esmPath = NODE_ENV.startsWith("production") ? "../index.js" : "../build/esm.js"

const trashPaths = globby.sync([
  "**/.?(esm-)cache",
  "test/**/*.gz"
], {
  cwd: rootPath,
  realpath: true
})

function runTests() {
  return execa("mocha", [
    "--require", esmPath,
    "--full-trace",
    "tests.js"
  ], {
    cwd: testPath,
    env: { HOME, NODE_PATH },
    stdio: "inherit"
  })
  .catch((e) => process.exit(e.code))
}

Promise
  // Clear cache folders for first run.
  .all(trashPaths.map(trash))
  // Run tests again using the cache.
  .then(runTests)
  .then(runTests)
