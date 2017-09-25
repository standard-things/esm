import assert from "assert"
import * as nsGz from "../fixture/file-extension/a.gz"
import * as nsJsGz from "../fixture/file-extension/a.js.gz"
import * as nsMjsGz from "../fixture/file-extension/a.mjs.gz"
import * as nsMjs from "../fixture/file-extension/a.mjs"

export default () => {
  const abcNs = {
    a: "a",
    b: "b",
    c: "c",
    default: "default"
  }

  const namespaces = [nsGz, nsJsGz, nsMjsGz, nsMjs]
  namespaces.forEach((ns) => assert.deepEqual(ns, abcNs))
}
