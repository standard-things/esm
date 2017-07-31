const natives = (() => {
  try {
    return process.binding("natives")
  } catch (e) {}
  return Object.create(null)
})()

export default natives
