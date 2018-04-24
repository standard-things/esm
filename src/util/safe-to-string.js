function safeToString(value) {
  if (typeof value === "string") {
    return value
  }

  try {
    return String(value)
  } catch (e) {}

  return ""
}

export default safeToString
