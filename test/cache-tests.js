import assert from "assert"
import fs from "fs-extra"
import { resolve } from "path"
import execa from "execa"
import globby from "globby"
import { env, execPath, kill } from "process"

const canRunCacheTest = Reflect.get(env, "ESM_ENV").includes("-cached")

const testPath = resolve(".")

function node(args, env) {
  return execa(execPath, args, {
    cwd: testPath,
    env,
    reject: false
  })
}

function runMain(filename, env, arg) {
  return node(["-r", "../", filename, arg], env)
}

function runNode(filename, args = []) {
  return node([filename, ...args])
}

const pathOnlyCacheFiles = [ ".data.blob", ".data.json" ]
const cacheFiles = [ ".loader.blob", ...pathOnlyCacheFiles ]

function cleanDirs() {
  return globby("*/**/.cache", {
    absolute: true,
    cwd: testPath,
    // dot: true,
    onlyDirectories: true
  })
  .then((files) =>
    Promise.all([
      fs.remove("../node_modules/.cache/esm"),
      ...files.map((file) => fs.remove(file))
    ])
  )
}

function countFiles(path) {
  return fs.exists(path)
    .then((exists) => {
      if (! exists) {
        return 0
      }

      return fs.readdir(path)
        .then((dir) => dir.length)
    })
}

describe.only("cache tests", function () {

  this.timeout(0)

  beforeEach(function () {
    if (! canRunCacheTest) {
      this.skip()
    }

    return cleanDirs()
  })

  after(function () {
    if (! canRunCacheTest) {
      this.skip()
    }

    return cleanDirs()
  })

  describe("should create cache files by default", function () {
    it("with cli", function () {
      const test = resolve(testPath, "fixture/esm-cache/cli")
      const cache = resolve(testPath, "../node_modules/.cache/esm")

      let filesCount = 0

      return countFiles(test)
        .then((count) => filesCount = count)
        .then(() => runMain(test))
        .then(({ stdout }) =>
          assert.ok(stdout === "cli")
        )
        .then(() => countFiles(cache))
        .then((count) =>
          assert.strictEqual(count, filesCount + cacheFiles.length)
        )
    })

    it("with bridge", function () {
      const test = resolve(testPath, "fixture/esm-cache/bridge")
      const cache = resolve(testPath, "../node_modules/.cache/esm")

      let filesCount = 0

      return countFiles(test)
        .then((count) => filesCount = count)
        .then(() => runNode(resolve(test, "bridge.js")))
        .then(({ stdout }) =>
          assert.ok(stdout === "bridge")
        )
        .then(() => countFiles(cache))
        .then((count) =>
          assert.strictEqual(count, filesCount + cacheFiles.length - 1)
        )
    })
  })

  describe("should create cache files with cache path option", function () {
    it("with cli option", function () {
      const test = resolve(testPath, "fixture/esm-cache/cli")
      const cache = resolve(test, ".cache")
      const options = { ESM_OPTIONS: JSON.stringify({ cache }) }

      let files = 0

      return countFiles(test)
        .then((count) => files = count)
        .then(() => runMain(test, options))
        .then(({ stdout }) =>
          assert.ok(stdout === "cli")
        )
        .then(() => countFiles(cache))
        .then((count) =>
          assert.strictEqual(count, files + pathOnlyCacheFiles.length)
        )
    })

    it("with bridge option", function () {
      const test = resolve(testPath, "fixture/esm-cache/bridge")
      const cache = resolve(test, ".cache")
      const options = JSON.stringify({ cache })

      let files = 0

      return countFiles(test)
        .then((count) => files = count)
        .then(() =>
          runNode(resolve(test, "bridge.js"), [options])
        )
        .then(({ stdout, stderr }) =>
          assert.ok(stdout === "bridge")
        )
        .then(() => countFiles(cache))
        .then((count) =>
          assert.strictEqual(count, files + pathOnlyCacheFiles.length - 1)
        )
    })
  })

  describe("should create cache files when cache is enabled", function () {
    it("with cli option", function () {
      const test = resolve(testPath, "fixture/esm-cache/cli")
      const cache = resolve(testPath, "../node_modules/.cache/esm")
      const options = { ESM_OPTIONS: JSON.stringify({ cache: true }) }

      let files = 0

      return countFiles(test)
        .then((count) => files = count)
        .then(() => runMain(test, options))
        .then(({ stdout }) =>
          assert.ok(stdout === "cli")
        )
        .then(() => countFiles(cache))
        .then((count) =>
          assert.strictEqual(count, files + cacheFiles.length)
        )
    })

    it("with bridge option", function () {
      const test = resolve(testPath, "fixture/esm-cache/bridge")
      const cache = resolve(testPath, "../node_modules/.cache/esm")
      const options = JSON.stringify({ cache: true })

      let files = 0

      return countFiles(test)
        .then((count) => files = count)
        .then(() =>
          runNode(resolve(test, "bridge.js"), [options])
        )
        .then(({ stdout, stderr }) =>
          assert.ok(stdout === "bridge")
        )
        .then(() => countFiles(cache))
        .then((count) =>
          assert.strictEqual(count, files + cacheFiles.length - 1)
        )
    })
  })

  describe("should not create cache files when cache is disabled", function () {
    it("with cli option", function () {
      const test = resolve(testPath, "fixture/esm-cache/cli")
      const cache = resolve(testPath, "../node_modules/.cache/esm")
      const options = { ESM_OPTIONS: JSON.stringify({ cache: false }) }

      return runMain(test, options)
        .then(({ stdout }) =>
          assert.ok(stdout === "cli")
        )
        .then(() => countFiles(cache))
        .then((count) =>
          assert.strictEqual(count, 1)
        )
    })

    it("with bridge option", function () {
      const test = resolve(testPath, "fixture/esm-cache/bridge")
      const cache = resolve(testPath, "../node_modules/.cache/esm")
      const options = JSON.stringify({ cache: false })

      return runNode(resolve(test, "bridge.js"), [options])
        .then(({ stdout, stderr }) =>
          assert.ok(stdout === "bridge")
        )
        .then(() => countFiles(cache))
        .then((count) =>
          assert.strictEqual(count, 1)
        )
    })
  })

  it("should not recreate cache files on restart", function () {
    const test = resolve(testPath, "fixture/esm-cache/cli")
    const cachePath = resolve(test, ".cache")
    const options = { ESM_OPTIONS: JSON.stringify({ cache: cachePath }) }

    let files

    return countFiles(test)
      .then((count) => files = count)
      .then(() =>
        [0, 1].reduce((promise) =>
          promise.then(() =>
            runMain(test, options)
          )
          .then(() => countFiles(cachePath))
          .then((count) =>
            assert.strictEqual(count, files + pathOnlyCacheFiles.length)
          )
        , Promise.resolve())
      )
  })

  // TODO .gitignore or fixture reset, or create fixture itself on the fly.
  // FIXME not sure if this is a bug, or an unfortunate necessity
  // --> the cache is growing indefinitely with every filechange
  // if it's the latter: change test case expected count to 12
  it.skip("should not create extra cache files when file changes", function () {
    function replace(path, value) {
      return fs.writeFile(path, value)
    }

    const test = resolve(testPath, "fixture/esm-cache/write")
    const cachePath = resolve(test, ".cache")
    const options = { ESM_OPTIONS: JSON.stringify({ cache: cachePath }) }

    return [0, 1, 2, 3, 4]
      .reduce((promise, args, index) => {
        return promise
          .then(() => {
            const code = `export const x = ${index}`
            return replace(resolve(test, "index.js"), code)
          })
          .then(() => runMain(test, options))
      }, Promise.resolve())
        .then(() => countFiles(cachePath))
        .then((count) =>
          assert.strictEqual(count, 3)
        )
  })

  describe.skip("should create cache files when process ends", function () {
    let pid

    afterEach(function () {
      try {
        kill(pid, "SIGKILL")
      } catch (e) {}
    })

    ;[
      "SIGINT",
      "SIGTERM",
      "exit"
    ].forEach(function (signal) {
      it(`should create cache files on ${signal}`, function () {
        const test = resolve(testPath, "fixture/esm-cache/sig")
        const cachePath = resolve(test, ".cache")
        const ESM_OPTIONS = JSON.stringify({ cache: cachePath })

        let files
        let processHandle
        const sigs = []

        const MAX_WAIT = 1000

        function waitFor(result) {
          let wait = 0

          return new Promise(function time(res, rej) {
            // console.log(sigs.join(" "))

            if (sigs.join(" ") === result) {
              return res()
            } else if (wait === MAX_WAIT) {
              return rej("test timed out.")
            }

            setTimeout(() => time(res, rej), wait += 200)
          })
        }

        return countFiles(test)
          .then((count) => files = count)
          .then(() => {
            processHandle = runMain(test, { ESM_OPTIONS }, signal)

            processHandle.stdout.on("data", (data) => {
              const sig = data.toString("utf8")
              sigs.push(sig)
            })

            ;({ pid } = processHandle)

            processHandle.unref()
          })
          .then(() =>
            waitFor(`sig-run-${signal} sig-interval-${signal}`)
          )
          .then(() => {
            if (signal === "exit") {
              processHandle.stdout.write("exit")
            } else {
              // console.log(pid, signal)
              kill(pid, signal)
            }
          })
          .then(() =>
            waitFor(`sig-run-${signal} sig-interval-${signal} sig-on-${signal}`)
          )
          .then(() => countFiles(cachePath))
          .then((count) =>
            assert.strictEqual(count, files + cacheFiles.length)
          )
      })
    })
  })
})
