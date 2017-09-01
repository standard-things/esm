import readFile from "./read-file.js"

const { parse } = JSON

function readJSON(filePath) {
  const content = readFile(filePath, "utf8")
  return content === null ? content : parse(content)
}

export default readJSON
