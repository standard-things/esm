import assert from "assert"
import * as nsGz from "../fixture/file-extension/a.gz"
import * as nsJsGz from "../fixture/file-extension/a.js.gz"
import * as nsMjsGz from "../fixture/file-extension/a.mjs.gz"

export default () => {
  const namespaces = [nsGz, nsJsGz, nsMjsGz]
  namespaces.forEach((ns) => assert.ok(ns))
}
