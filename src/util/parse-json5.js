import { parse } from "json5"

function parseJSON5(string) {
  try {
    return parse(string)
  } catch (e) {}

  return null
}

export default parseJSON5
