import has from "../util/has.js"

function noDeprecationWarning(callback) {
  let result
  const { noDeprecation } = process
  const shouldRestore = has(process, "noDeprecation")

  process.noDeprecation = true

  try {
    result = callback()
  } catch (e) {}

  if (shouldRestore) {
    process.noDeprecation = noDeprecation
  } else {
    delete process.noDeprecation
  }

  return result
}

export default noDeprecationWarning
