import {
  join,
  relative,
  sep,
} from "path"

import {
  readdirSync,
  readFileSync,
  statSync,
} from "fs"

export const files = Object.create(null)

function walk(dir) {
  readdirSync(dir).forEach((item) => {
    const absPath = join(dir, item)
    const relPath = relative(__dirname, absPath)
    const relParts = relPath.split(sep)
    const stat = statSync(absPath)

    if (stat.isDirectory() &&
        // Ignore cache folder.
        relParts[0] !== ".cache") {
      walk(absPath)

    } else if (stat.isFile() &&
        // Ignore non-.js files.
        relPath.endsWith(".js")) {
      files[absPath] = readFileSync(absPath, "utf8")
    }
  })
}

walk(__dirname)
