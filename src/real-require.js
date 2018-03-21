import shared from "./shared.js"

const realRequire = (() => {
  const { symbol } = shared

  try {
    return realRequire(symbol.realRequire)
  } catch (e) {}

  try {
    return realRequire(symbol.esmRealRequire)
  } catch (e) {}

  return __non_webpack_require__
})()

export default realRequire
