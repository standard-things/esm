import { dirname } from "path"

function getModuleDirname(mod) {
  const filePath = mod && mod.filename
  return typeof filePath === "string" ? dirname(filePath) : "."
}

export default getModuleDirname
