import { parse } from "json-6"

function parseJSON6(string) {
  try {
    return parse(string)
  } catch (e) {}

  return null
}

export default parseJSON6
