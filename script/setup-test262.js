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
  "test/language/export",
  "test/language/import",
  "test/language/module-code",
  "harness"
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

      for (const filename of test262Tests) {
        let content = fs.readFileSync(filename, "utf-8")

        const { attrs } = test262Parser.parseFile(content)

        const pragma =
          '"use ' +
          (attrs.flags.module ? "module" : "script") +
          '";'

        const pos = content.indexOf(YAML_END)

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
    })
}

module.exports = setupTest262
