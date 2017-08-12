/* eslint strict: off, node/no-unsupported-features: ["error", { version: 4 }] */
"use strict"

const execa = require("execa")
const fs = require("fs-extra")
const path = require("path")

const rootPath = path.join(__dirname, "..")
const jsonPath = path.join(rootPath, "package.json")

const removePrivateRegExp = /,\s*"private":\s*true/

function publishPackage() {
  return execa("npm", ["publish"], {
    cwd: rootPath,
    stdio: "inherit"
  })
  .catch((e) => process.exit(e.code))
}

fs.readFile(jsonPath, "utf8")
  .then((jsonText) => fs
    .writeFile(jsonPath, jsonText.replace(removePrivateRegExp, ""))
    .then(publishPackage)
    .then(() => fs.writeFile(jsonPath, jsonText))
  )
