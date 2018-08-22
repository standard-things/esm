"use strict"

const { prepareStackTrace } = Error

Error.prepareStackTrace = (error, structuredStackTrace) => structuredStackTrace
String.prototype.a = "a"

const error = new Error

Error.captureStackTrace(error)

const CJS_BUILTIN_PROTOTYPE_MODIFICATION = "".a === "a"
const CJS_STRUCTURED_STACK_TRACE = error.stack

Error.prepareStackTrace = prepareStackTrace
Reflect.deleteProperty(String.prototype, "a")

const object = {}

module.exports = {
  CJS_BUFFER_PROP: global.Buffer,
  CJS_BUFFER_VAR: Buffer,
  CJS_BUILTIN_PROTOTYPE_MODIFICATION,
  CJS_CLEAR_IMMEDIATE_PROP: global.clearImmediate,
  CJS_CLEAR_IMMEDIATE_VAR: clearImmediate,
  CJS_CLEAR_INTERVAL_PROP: global.clearInterval,
  CJS_CLEAR_INTERVAL_VAR: clearInterval,
  CJS_CLEAR_TIMEOUT_PROP: global.clearTimeout,
  CJS_CLEAR_TIMEOUT_VAR: clearTimeout,
  CJS_JEST_GLOBAL_PROP: global.JEST_GLOBAL,
  CJS_JEST_GLOBAL_VAR: JEST_GLOBAL,
  CJS_OBJECT_CONSTRUCTOR: object.constructor === Object,
  CJS_OBJECT_CONSTRUCTOR_INSTANCE: Object instanceof Object,
  CJS_OBJECT_LITERAL_INSTANCE: object instanceof Object,
  CJS_PROCESS_PROP: global.process,
  CJS_PROCESS_VAR: process,
  CJS_SET_IMMEDIATE_PROP: global.setImmediate,
  CJS_SET_IMMEDIATE_VAR: setImmediate,
  CJS_SET_INTERVAL_PROP: global.setInterval,
  CJS_SET_INTERVAL_VAR: setInterval,
  CJS_SET_TIMEOUT_PROP: global.setTimeout,
  CJS_SET_TIMEOUT_VAR: setTimeout,
  CJS_STRUCTURED_STACK_TRACE,
  CJS_URL_PROP: global.URL,
  CJS_URL_SEARCH_PARAMS_PROP: global.URLSearchParams,
  CJS_URL_SEARCH_PARAMS_VAR: typeof URLSearchParams === "undefined" ? void 0 : URLSearchParams,
  CJS_URL_VAR: typeof URL === "undefined" ? void 0 : URL
}
