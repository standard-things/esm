import assert from "assert"
import execa from "execa"
import fs from "fs-extra"
import path from "path"
import process from "process"
import trash from "../script/trash.js"

const isAppVeyor = Reflect.has(process.env, "APPVEYOR")

const canTestCache =
  ! isAppVeyor &&
  /cached/.test(process.env.ESM_ENV)

const fixturePath = path.resolve("fixture/cache")
const testPath = path.resolve(".")
const mainFilename = path.resolve(fixturePath, "main.mjs")

const backupSharedCachePath = path.resolve("../node_modules/_cache")
const loaderCachePath = path.resolve("../node_modules/.cache/esm")
const fixtureCachePath = path.resolve(fixturePath, ".cache")
const sharedCachePath = path.resolve("../node_modules/.cache")

const expectedCacheCount = 5

function countFiles(dirPath) {
  return fs.existsSync(dirPath)
    ? fs.readdirSync(dirPath).length
    : 0
}

function move(srcPath, destPath) {
  fs.moveSync(srcPath, destPath, {
    overwrite: true
  })
}

function node(args, env) {
  return execa(process.execPath, args, {
    cwd: testPath,
    env,
    reject: false
  })
}

function runMain(filename, env) {
  return node([
    "-r", "../index.js",
    filename
  ], env)
}

describe("cache tests", function () {
  this.timeout(0)

  before(function () {
    if (! canTestCache) {
      // skip() doesn't work for nested describe() calls.
      // https://github.com/mochajs/mocha/issues/2683#issuecomment-375629901
      this.test.parent.pending = true
      this.skip()
    }

    move(sharedCachePath, backupSharedCachePath)
  })

  beforeEach(function () {
    if (! canTestCache) {
      this.skip()
    }

    return trash([
      loaderCachePath,
      fixtureCachePath
    ])
  })

  after(function () {
    if (! canTestCache) {
      this.skip()
    }

    move(backupSharedCachePath, sharedCachePath)
  })

  it("should not recreate cache on restart", () =>
    [0, 1]
      .reduce((promise) =>
        promise
          .then(() =>
            runMain(mainFilename, {
              ESM_OPTIONS: '{cache:"' + fixtureCachePath + '"}'
            })
          )
          .then(() => assert.strictEqual(countFiles(fixtureCachePath), expectedCacheCount))
      , Promise.resolve())
  )

  describe("should create cache", () => {
    it("should work from the `esm` bridge", () =>
      node([fixturePath])
        .then(({ stdout }) => assert.ok(stdout.includes("cache:true")))
        .then(() => assert.strictEqual(countFiles(loaderCachePath), expectedCacheCount))
    )

    it("should work from the Node CLI", () =>
      runMain(mainFilename)
        .then(({ stdout }) => assert.ok(stdout.includes("cache:true")))
        .then(() => assert.strictEqual(countFiles(loaderCachePath), expectedCacheCount))
    )

    it("should not insert `yield` into cache files", () =>
      runMain(mainFilename)
        .then(() => {
          const filenames = fs
            .readdirSync(loaderCachePath)
            .filter((filename) => path.extname(filename) === ".js")
            .map((filename) => path.resolve(loaderCachePath, filename))

          for (const filename of filenames) {
            const content = fs.readFileSync(filename, "utf8")

            assert.strictEqual(content.includes("yield"), false)
          }
        })
    )
  })

  describe("should support `options.cache` paths", () => {
    it("should work from the `esm` bridge", () =>
      node([fixturePath], {
        ESM_OPTIONS: '{cache:"' + fixtureCachePath + '"}'
      })
      .then(({ stdout }) => assert.ok(stdout.includes("cache:true")))
      .then(() => assert.strictEqual(countFiles(fixtureCachePath), expectedCacheCount))
    )

    it("should work from the Node CLI", () =>
      runMain(mainFilename, {
        ESM_OPTIONS: '{cache:"' + fixtureCachePath + '"}'
      })
      .then(({ stdout }) => assert.ok(stdout.includes("cache:true")))
      .then(() => assert.strictEqual(countFiles(fixtureCachePath), expectedCacheCount))
    )
  })

  describe("should create cache when enabled", () => {
    it("should work from the `esm` bridge", () =>
      node([fixturePath], {
        ESM_OPTIONS: "{cache:1}"
      })
      .then(({ stdout }) => assert.ok(stdout.includes("cache:true")))
      .then(() => assert.strictEqual(countFiles(loaderCachePath), expectedCacheCount))
    )

    it("should work from the Node CLI", () =>
      runMain(mainFilename, {
        ESM_OPTIONS: "{cache:1}"
      })
      .then(({ stdout }) => assert.ok(stdout.includes("cache:true")))
      .then(() => assert.strictEqual(countFiles(loaderCachePath), expectedCacheCount))
    )
  })

  describe("should not create cache when disabled", () => {
    it("should work from the `esm` bridge", () =>
      node([fixturePath], {
        ESM_OPTIONS: "{cache:0}"
      })
      .then(({ stdout }) => assert.ok(stdout.includes("cache:true")))
      .then(() => assert.strictEqual(countFiles(loaderCachePath), 2))
    )

    it("should work from the Node CLI", () =>
      runMain(mainFilename, {
        ESM_OPTIONS: "{cache:0}"
      })
      .then(({ stdout }) => assert.ok(stdout.includes("cache:true")))
      .then(() => assert.strictEqual(countFiles(loaderCachePath), 2))
    )
  })
})
