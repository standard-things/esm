import has from "../util/has.js"

function noDeprecationWarning(getter) {
  let result
  const { noDeprecation } = process
  const shouldRestore = has(process, "noDeprecation")

  process.noDeprecation = true

  try {
    result = getter()
  } catch (e) {}

  if (shouldRestore) {
    process.noDeprecation = noDeprecation
  } else {
    delete process.noDeprecation
  }

  if (typeof result !== "function") {
    return result
  }

  return function (...args) {
    return noDeprecationWarning(() => result.apply(this, args))
  }
}

export default noDeprecationWarning
