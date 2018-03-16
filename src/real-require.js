import shared from "./shared.js"

const realRequire = (() => {
  const { symbol } = shared

  try {
    return realRequire(symbol.require)
  } catch (e) {}

  try {
    return realRequire(symbol.esmRequire)
  } catch (e) {}

  return __non_webpack_require__
})()

export default realRequire
