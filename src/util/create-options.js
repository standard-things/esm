import defaults from "./defaults.js"

function createOptions(options, defaultOptions) {
  return defaults({ __proto__: null }, options, defaultOptions)
}

export default createOptions
