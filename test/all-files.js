import __dirname from "./__dirname.js"
import fs from "fs"
import path from "path"

const files = Object.create(null)

function walk(dir) {
  fs.readdirSync(dir).forEach((item) => {
    const absPath = path.join(dir, item)
    const relPath = path.relative(__dirname, absPath)
    const relParts = relPath.split(path.sep)
    const stat = fs.statSync(absPath)

    /* eslint lines-around-comment: off */
    if (stat.isDirectory() &&
        // Ignore cache folder.
        relParts[0] !== ".cache") {
      walk(absPath)

    } else if (stat.isFile() &&
        // Ignore non-.js files.
        relPath.endsWith(".js")) {
      files[absPath] = fs.readFileSync(absPath, "utf8")
    }
  })
}

walk(__dirname)

export default files
