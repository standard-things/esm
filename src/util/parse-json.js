import toString from "./to-string.js"

const { parse } = JSON

function parseJSON(string) {
  try {
    return parse(toString(string))
  } catch (e) {}

  return null
}

export default parseJSON
