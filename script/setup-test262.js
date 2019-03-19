"use strict"

const execa = require("execa")
const fs = require("fs-extra")
const globby = require("globby")
const path = require("path")
const test262Parser = require("test262-parser")
const trash = require("./trash.js")

const YAML_END = "---*/"

const rootPath = path.resolve(__dirname, "..")
const test262Path = path.resolve(rootPath, "test/vendor/test262")
const repoPath = path.resolve(test262Path, ".repo")

const testDirs = [
  "harness",
  "test/language/export",
  "test/language/expressions/dynamic-import",
  "test/language/expressions/import.meta",
  "test/language/import",
  "test/language/module-code"
]

function git(cwd, args) {
  return execa("git", args, {
    cwd,
    reject: false
  })
}

function setupTest262() {
  if (fs.existsSync(test262Path)) {
    return Promise.resolve()
  }

  return trash(repoPath)
    .then(() =>
      git(rootPath, [
        "clone",
        "--depth",
        "1",
        "https://github.com/tc39/test262.git",
        repoPath
      ])
    )
    .then(() =>
      testDirs
        .reduce((promise, testDir) => {
          const repoDirPath = path.resolve(repoPath, testDir)
          const testDirPath = path.resolve(test262Path, testDir)

          return promise
            .then(() => trash(testDirPath))
            .then(() => fs.move(repoDirPath, testDirPath))
        }, Promise.resolve())
    )
    .then(() => trash(repoPath))
    .then(() => {
      const test262Tests = globby.sync([
        "test/language/**/*.js",
        "!**/*_FIXTURE.js"
      ], {
        absolute: true,
        cwd: test262Path
      })

      const trashed = []

      for (const filename of test262Tests) {
        let content = fs.readFileSync(filename, "utf-8")

        const { attrs } = test262Parser.parseFile(content)
        const features = attrs.features || []
        const { flags } = attrs

        if (! flags.module &&
            ! features.includes("dynamic-import")) {
          trashed.push(filename)
          continue
        }

        // Follow Test262 guidance for strict mode.
        // https://github.com/tc39/test262/blob/master/INTERPRETING.md#strict-mode
        content =
          (flags.onlyStrict
            ? '"use strict";\n'
            : ""
          ) +
          content

        const pos = content.indexOf(YAML_END)

        const pragma =
          '"use ' +
          (flags.module
            ? "module"
            : "script"
          ) +
          '";'

        if (pos === -1) {
          content =
            pragma + "\n" +
            content
        } else {
          const start = pos + YAML_END.length

          content =
            content.slice(0, start) + "\n" +
            pragma + "\n" +
            content.slice(start)
        }

        fs.writeFileSync(filename, content)
      }

      return trash(trashed)
    })
}

module.exports = setupTest262
