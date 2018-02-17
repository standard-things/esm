import Module from "../../module.js"

import { extname } from "path"

function loader(entry, preload) {
  if (preload) {
    preload(entry)
  }

  const mod = entry.module
  const { filename } = mod

  let ext = extname(filename)

  if (ext === "" ||
      typeof Module._extensions[ext] !== "function") {
    ext = ".js"
  }

  Module._extensions[ext](mod, filename)
  mod.loaded = true
}

export default loader
