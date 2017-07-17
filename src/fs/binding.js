const binding = (() => {
  try {
    return process.binding("fs")
  } catch (e) {}
  return Object.create(null)
})()

export default binding
