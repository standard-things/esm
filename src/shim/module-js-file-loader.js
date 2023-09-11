import { readFileSync } from "fs"

function jsFileLoader(module, filename) {
  const content = readFileSync(filename, "utf8")
  module._compile(content, filename)
}

export default jsFileLoader
