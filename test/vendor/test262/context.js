import { createContext, Script } from "vm"
import { basename, resolve } from "path"
import test262Parser from "test262-parser"
import fs from "fs-extra"
import globby from "globby"
import { stdout } from "process"

// TODO:
const testPath = resolve("../test/vendor/test262/.js-tests")

const harnessFiles = [
  "assert.js",
  "sta.js",
  "doneprintHandle.js",
  "fnGlobalObject.js"
]

function getHarnessFiles() {
  return globby.sync(["harness/*.js"], {
    absolute: true,
    cwd: testPath
  })
}

const sandbox = createContext(global)

export default function harnessContext() {
  getHarnessFiles()
    .filter((file) => harnessFiles.includes(basename(file)))
    .map((filename) => fs.readFileSync(filename, "utf-8"))
    .forEach((rawHarness) => {
      const { contents } = test262Parser.parseFile(rawHarness)
      new Script(contents).runInContext(sandbox)
    })
}
