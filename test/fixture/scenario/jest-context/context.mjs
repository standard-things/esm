const { prepareStackTrace } = Error

Error.prepareStackTrace = (error, structuredStackTrace) => structuredStackTrace
String.prototype.a = "a"

const error = new Error

Error.captureStackTrace(error)

export const ESM_BUILTIN_PROTOTYPE_MODIFICATION = "".a === "a"
export const ESM_STRUCTURED_STACK_TRACE = error.stack

Error.prepareStackTrace = prepareStackTrace
Reflect.deleteProperty(String.prototype, "a")

const object = {}

export const ESM_BUFFER_PROP = global.Buffer
export const ESM_BUFFER_VAR = Buffer
export const ESM_CLEAR_IMMEDIATE_PROP = global.clearImmediate
export const ESM_CLEAR_IMMEDIATE_VAR = clearImmediate
export const ESM_CLEAR_INTERVAL_PROP = global.clearInterval
export const ESM_CLEAR_INTERVAL_VAR = clearInterval
export const ESM_CLEAR_TIMEOUT_PROP = global.clearTimeout
export const ESM_CLEAR_TIMEOUT_VAR = clearTimeout
export const ESM_JEST_GLOBAL_PROP = global.JEST_GLOBAL
export const ESM_JEST_GLOBAL_VAR = JEST_GLOBAL
export const ESM_OBJECT_CONSTRUCTOR = object.constructor === Object
export const ESM_OBJECT_CONSTRUCTOR_INSTANCE = Object instanceof Object
export const ESM_OBJECT_LITERAL_INSTANCE = object instanceof Object
export const ESM_PROCESS_PROP = global.process
export const ESM_PROCESS_VAR = process
export const ESM_SET_IMMEDIATE_PROP = global.setImmediate
export const ESM_SET_IMMEDIATE_VAR = setImmediate
export const ESM_SET_INTERVAL_PROP = global.setInterval
export const ESM_SET_INTERVAL_VAR = setInterval
export const ESM_SET_TIMEOUT_PROP = global.setTimeout
export const ESM_SET_TIMEOUT_VAR = setTimeout
export const ESM_URL_PROP = global.URL
export const ESM_URL_SEARCH_PARAMS_PROP = global.URLSearchParams
export const ESM_URL_SEARCH_PARAMS_VAR = typeof URLSearchParams === "undefined" ? void 0 : URLSearchParams
export const ESM_URL_VAR = typeof URL === "undefined" ? void 0 : URL
