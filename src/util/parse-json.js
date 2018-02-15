import SafeJSON from "../builtin/json.js"

function parseJSON(string) {
  try {
    return SafeJSON.parse(string)
  } catch (e) {}

  return null
}

export default parseJSON
