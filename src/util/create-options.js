import defaults from "./defaults.js"

function createOptions(options, defaultOptions) {
  return defaults(Object.create(null), options, defaultOptions)
}

export default createOptions
