import execa from "execa"
import globby from "globby"
import path from "path"
import trash from "trash"

const rootPath = path.join(__dirname, "..")
const testPath = path.join(rootPath, "test")

const execOptions = {
  cwd: testPath,
  stdio: "inherit"
}

const mochaArgs = [
  "--require", "../build/esm.js",
  "--full-trace",
  "tests.js"
]

function runTests() {
  return execa("mocha", mochaArgs, execOptions)
}

globby(["**/.*/"], { cwd: testPath, realpath: true })
  // Clear cache folders for first run.
  .then((cachePaths) => Promise.all(cachePaths.map(trash)))
  // Run tests again using the cache.
  .then(runTests)
  .then(runTests)
