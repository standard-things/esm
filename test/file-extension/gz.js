"use strict"

const assert = require("assert")
const nsGz = require("../fixture/file-extension/a.gz")
const nsJsGz = require("../fixture/file-extension/a.js.gz")

module.exports = () =>
  import("../fixture/file-extension/a.mjs.gz")
    .then((nsMjsGz) => {
      const namespaces = [nsGz, nsJsGz, nsMjsGz]
      namespaces.forEach((ns) => assert.ok(ns))
    })
