import readFile from "./read-file.js"

function readJSON(filePath) {
  const content = readFile(filePath, "utf8")
  return content === null ? content : JSON.parse(content)
}

export default readJSON
