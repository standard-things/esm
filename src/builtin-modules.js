import Entry from "./entry.js"
import FastObject from "./fast-object.js"
import Module from "./module.js"

import setGetter from "./util/set-getter.js"
import setProperty from "./util/set-property.js"
import setSetter from "./util/set-setter.js"

const ids = [
  "assert",
  "buffer",
  "child_process",
  "cluster",
  "console",
  "constants",
  "crypto",
  "dgram",
  "dns",
  "domain",
  "events",
  "fs",
  "http",
  "https",
  "module",
  "net",
  "os",
  "path",
  "process",
  "punycode",
  "querystring",
  "readline",
  "repl",
  "stream",
  "string_decoder",
  "sys",
  "timers",
  "tls",
  "tty",
  "url",
  "util",
  "v8",
  "vm",
  "zlib"
]

const builtinModules = ids.reduce((object, id) => {
  setGetter(object, id, () => {
    const mod = new Module(id, null)
    mod.exports = mod.require(id)
    mod.loaded = true

    const entry = Entry.get(mod)
    entry.loaded()
    return object[id] = entry
  })

  setSetter(object, id, (value) => {
    setProperty(object, id, { value })
  })

  return object
}, new FastObject)

export default builtinModules
