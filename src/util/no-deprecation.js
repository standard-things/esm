import has from "./has.js"

function noDeprecation(callback) {
  const original = process.noDeprecation
  const shouldRestore = has(process, "noDeprecation")

  process.noDeprecation = true

  let result

  try {
    result = callback()
  } catch (e) {}

  if (shouldRestore) {
    process.noDeprecation = original
  } else {
    delete process.noDeprecation
  }

  return result
}

export default noDeprecation
