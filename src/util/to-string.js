function toString(value) {
  if (typeof value === "string") {
    return value
  }
  return value == null ? "" : String(value)
}

export default toString
