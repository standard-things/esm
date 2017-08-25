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
  "crypto",
  "dgram",
  "dns",
  "events",
  "fs",
  "http",
  "https",
  "module",
  "net",
  "os",
  "path",
  "querystring",
  "readline",
  "repl",
  "stream",
  "string_decoder",
  "timers",
  "tls",
  "tty",
  "url",
  "util",
  "vm",
  "zlib"
]

const builtinModules = ids
  .reduce((object, id) => {
    setGetter(object, id, () => {
      const mod = new Module(id, null)
      mod.exports = mod.require(id)
      mod.loaded = true
      return object[id] = mod
    })

    setSetter(object, id, (value) => {
      setProperty(object, id, { value })
    })

    return object
  }, new FastObject)

export default builtinModules
