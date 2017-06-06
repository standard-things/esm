export let value = "value-1"
export default "default-1"

export function exportAgain() {
  // Neither of these re-export styles should work, because the original
  // export default still takes precedence over anything else.
  module.exportDefault(exports.default = "default-2")

  // This style also does not work, because the getter function for the
  // variable value is all that matters.
  exports.value = "ignored"

  const n = +value.split("-")[1] + 1
  value = "value-" + n
}

export function oneLastExport() {
  value = "value-3"
}
