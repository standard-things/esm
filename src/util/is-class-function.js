import shared from "../shared.js"

function init() {
  // `Function#toString()` is used to extract the coerced string source of a
  // function regardless of any custom `toString()` method it may have.
  const { toString } = Function.prototype

  const classFuncRegex = /^class /

  function isClassFunction(value) {
    if (typeof value === "function") {
      // A try-catch is needed in Node < 10 to avoid a type error when
      // coercing proxy wrapped functions.
      try {
        return classFuncRegex.test(toString.call(value))
      } catch {}
    }

    return false
  }

  return isClassFunction
}

export default shared.inited
  ? shared.module.utilIsClassFunction
  : shared.module.utilIsClassFunction = init()
