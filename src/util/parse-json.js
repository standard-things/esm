function parseJSON(string) {
  try {
    return JSON.parse(string)
  } catch (e) {}

  return null
}

export default parseJSON
