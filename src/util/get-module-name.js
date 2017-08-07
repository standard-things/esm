import { basename } from "path"

function getModuleName(mod) {
  const { filename, id } = mod
  return typeof filename === "string" ? basename(filename) : id
}

export default getModuleName
