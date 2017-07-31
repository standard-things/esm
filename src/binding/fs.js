const fs = (() => {
  try {
    return process.binding("fs")
  } catch (e) {}
  return Object.create(null)
})()

export default fs
