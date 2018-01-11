"use strict"

const execa = require("execa")
const fs = require("fs-extra")
const minifyHTML = require("html-minifier").minify
const path = require("path")

const rootPath = path.resolve(__dirname, "..")
const pkgPath = path.resolve(rootPath, "package.json")
const readmePath = path.resolve(rootPath, "README.md")

const defaultScripts = `,
  "scripts": {
    "test": "echo \\"Error: no test specified\\" && exit 1"
  }`

const fieldsToRemove = [
  "@std/esm",
  "dependencies",
  "devDependencies",
  "optionalDevDependencies",
  "private"
]

const scriptsRegExp = makeFieldRegExp("scripts")
const tableRegExp = /^<table>[^]*?\n<\/table>/gm

function cleanPackageJSON(content) {
  return removeFields(resetScripts(content), fieldsToRemove)
}

function cleanReadme(content) {
  return content
    .trim()
    .replace(tableRegExp, (table) =>
      minifyHTML(table, {
        collapseBooleanAttributes: true,
        collapseInlineTagWhitespace: true,
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
    )
}

function makeFieldRegExp(field) {
  return RegExp(',\\s*"' + field + '":\\s*(\\{[^]*?\\}|[^]*?)(?=,?\\n)')
}

function publishPackage() {
  return execa("npm", ["publish"], {
    cwd: rootPath,
    reject: false,
    stdio: "inherit"
  })
}

function removeField(content, field) {
  return content.replace(makeFieldRegExp(field), "")
}

function removeFields(content, fields) {
  return fields.reduce(removeField, content)
}

function resetScripts(content) {
  return content.replace(scriptsRegExp, defaultScripts)
}

Promise
  .all([
    fs.readFile(pkgPath, "utf8"),
    fs.readFile(readmePath, "utf8")
  ])
  .then((contents) => {
    const pkgContent = contents[0]
    const readmeContent = contents[1]

    return Promise
      .all([
        fs.outputFile(pkgPath, cleanPackageJSON(pkgContent)),
        fs.outputFile(readmePath, cleanReadme(readmeContent))
      ])
      .then(publishPackage)
      .then(() => Promise
        .all([
          fs.outputFile(pkgPath, pkgContent),
          fs.outputFile(readmePath, readmeContent)
        ])
      )
  })
