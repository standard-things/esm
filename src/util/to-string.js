function toString(value) {
  return typeof value === "string"
    ? value
    : String(value)
}

export default toString
