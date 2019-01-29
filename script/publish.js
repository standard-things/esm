"use strict"

const execa = require("execa")
const fleece = require("golden-fleece")
const fs = require("fs-extra")
const htmlmin = require("html-minifier").minify
const path = require("path")
const terser = require("terser").minify

const rootPath = path.resolve(__dirname, "..")
const esmPath = path.resolve(rootPath, "esm.js")
const indexPath = path.resolve(rootPath, "index.js")
const pkgPath = path.resolve(rootPath, "package.json")
const readmePath = path.resolve(rootPath, "README.md")

const tableRegExp = /^<table>[^]*?\n<\/table>/gm
const terserOptions = fs.readJSONSync(path.resolve(rootPath, ".terserrc"))

const defaultScripts = {
  test: 'echo "Error: no test specified" && exit 1'
}

const fieldsToRemove = [
  "devDependencies",
  "esm",
  "private",
  "scripts"
]

const jsPaths = [
  esmPath,
  indexPath
]

function cleanJS() {
  for (const filename of jsPaths) {
    const content = fs.readFileSync(filename, "utf8")

    process.once("exit", () => fs.outputFileSync(filename, content))

    fs.outputFileSync(filename, minifyJS(content))
  }
}

function cleanPackageJSON() {
  const content = fs.readFileSync(pkgPath, "utf8")

  process.once("exit", () => fs.outputFileSync(pkgPath, content))

  const pkgJSON = JSON.parse(content)

  for (const field of fieldsToRemove) {
    Reflect.deleteProperty(pkgJSON, field)
  }

  pkgJSON.scripts = defaultScripts
  fs.outputFileSync(pkgPath, fleece.patch(content, pkgJSON))
}

function cleanReadme() {
  const content = fs.readFileSync(readmePath, "utf8")

  process.once("exit", () => fs.outputFileSync(readmePath, content))

  fs.outputFileSync(readmePath, content.replace(tableRegExp, minifyHTML))
}

function minifyHTML(content) {
  return htmlmin(content, {
    collapseBooleanAttributes: true,
    collapseWhitespace: true,
    decodeEntities: true,
    removeAttributeQuotes: true,
    removeComments: true,
    removeEmptyAttributes: true,
    removeEmptyElements: true,
    removeOptionalTags: true,
    removeRedundantAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    removeTagWhitespace: true
  })
}

function minifyJS(content) {
  return terser(content, terserOptions).code
}

function publishPackage() {
  return execa("npm", ["publish"], {
    cwd: rootPath,
    stdio: "inherit"
  })
}

Promise
  .all([
    cleanJS(),
    cleanPackageJSON(),
    cleanReadme()
  ])
  .then(publishPackage)
  .catch(console.error)
