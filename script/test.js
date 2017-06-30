import execa from "execa"
import globby from "globby"
import path from "path"
import trash from "trash"

const NODE_ENV = String(process.env.NODE_ENV)
const esmPath = NODE_ENV.startsWith("production") ? "../index.js" : "../build/esm.js"
const rootPath = path.join(__dirname, "..")
const testPath = path.join(rootPath, "test")

const cachePaths = globby.sync("**/.?(esm-)cache", {
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
    stdio: "inherit"
  })
  .catch((e) => process.exit(e.code))
}

Promise
  // Clear cache folders for first run.
  .all(cachePaths.map(trash))
  // Run tests again using the cache.
  .then(runTests)
  .then(runTests)
