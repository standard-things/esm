const assert = require("assert")
const nsGz = require("../fixture/file-extension/a.gz")
const nsJsGz = require("../fixture/file-extension/a.js.gz")
const nsMjsGz = require("../fixture/file-extension/a.mjs.gz")
const nsMjs = require("../fixture/file-extension/a.mjs")

module.exports = () => {
  const abcNs = {
    a: "a",
    b: "b",
    c: "c",
    default: "default"
  }

  const namespaces = [nsGz, nsJsGz, nsMjsGz, nsMjs]
  namespaces.forEach((ns) => assert.deepEqual(ns, abcNs))
}
