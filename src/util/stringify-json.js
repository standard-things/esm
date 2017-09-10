const { stringify } = JSON

function stringifyJSON(value) {
  try {
    return stringify(value) || ""
  } catch (e) {}

  return ""
}

export default stringifyJSON
