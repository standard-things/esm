"use strict"

const execa = require("execa")
const fs = require("fs-extra")
const htmlmin = require("html-minifier").minify
const path = require("path")
const uglify = require("uglify-es").minify

const rootPath = path.resolve(__dirname, "..")
const esmPath = path.resolve(rootPath, "esm.js")
const indexPath = path.resolve(rootPath, "index.js")
const pkgPath = path.resolve(rootPath, "package.json")
const readmePath = path.resolve(rootPath, "README.md")

const uglifyOptions = JSON.parse(fs.readFileSync(path.resolve(rootPath, ".uglifyrc")))

const jsPaths = [
  esmPath,
  indexPath
]

const defaultScripts = `,
  "scripts": {
    "test": "echo \\"Error: no test specified\\" && exit 1"
  }`

const fieldsToRemove = [
  "devDependencies",
  "esm",
  "private"
]

const scriptsRegExp = makeFieldRegExp("scripts")
const tableRegExp = /^<table>[^]*?\n<\/table>/gm

function cleanJS() {
  return jsPaths
    .reduce((promise, filePath) =>
      promise
        .then(() => fs.readFile(filePath, "utf8"))
        .then((content) => {
          process.once("exit", () => fs.outputFileSync(filePath, content))
          return fs.outputFile(filePath, minifyJS(content))
        })
    , Promise.resolve())
}

function cleanPackageJSON() {
  return fs
    .readFile(pkgPath, "utf8")
    .then((content) => {
      process.once("exit", () => fs.outputFileSync(pkgPath, content))
      return fs.outputFile(pkgPath, removeFields(resetScripts(content), fieldsToRemove))
    })
}

function cleanReadme() {
  return fs
    .readFile(readmePath, "utf8")
    .then((content) => {
      process.once("exit", () => fs.outputFileSync(readmePath, content))
      return fs.outputFile(readmePath, content.replace(tableRegExp, minifyHTML))
    })
}

function makeFieldRegExp(field) {
  return RegExp(',\\s*"' + field + '":\\s*(\\{[^]*?\\}|[^]*?)(?=,?\\n)')
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
  return uglify(content, uglifyOptions).code
}

function publishPackage() {
  return execa("npm", ["publish"], {
    cwd: rootPath,
    reject: false,
    stdio: "inherit"
  })
}

function removeField(content, field) {
  return String(content).replace(makeFieldRegExp(field), "")
}

function removeFields(content, fields) {
  return fields.reduce(removeField, content)
}

function resetScripts(content) {
  return String(content).replace(scriptsRegExp, defaultScripts)
}

Promise
  .all([
    cleanJS(),
    cleanPackageJSON(),
    cleanReadme()
  ])
  .then(publishPackage)
