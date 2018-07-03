import shared from "../shared.js"

function init() {
  const globalNames = [
    "clearImmediate",
    "clearInterval",
    "clearTimeout",
    "console",
    "global",
    "setImmediate",
    "setInterval",
    "setTimeout",
    "URL",
    "URLSearchParams"
  ]

  function prepareContext(context) {
    for (const name of globalNames) {
      const descriptor = Reflect.getOwnPropertyDescriptor(context, name)

      if (descriptor) {
        Reflect.deleteProperty(context, name)
        Reflect.defineProperty(context, name, descriptor)
      }
    }

    return context
  }

  return prepareContext
}

export default shared.inited
  ? shared.module.utilPrepareContext
  : shared.module.utilPrepareContext = init()
