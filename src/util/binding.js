const binding = (() => {
  try {
    return process.binding("util")
  } catch (e) {}
  return Object.create(null)
})()

export default binding
