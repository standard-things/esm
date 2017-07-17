export default function removeProperty(object, key) {
  try {
    return delete object[key]
  } catch (e) {}
  return false
}
