function removeProperty(object, key) {
  try {
    return delete object[key]
  } catch (e) {}
  return false
}

export default removeProperty
