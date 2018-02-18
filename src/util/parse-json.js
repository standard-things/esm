const { parse } = JSON

function parseJSON(string) {
  try {
    return parse(string)
  } catch (e) {}

  return null
}

export default parseJSON
