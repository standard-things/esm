/* eslint-disable sort-keys */
const ENTRY = {
  __proto__: null,
  LOAD: {
    __proto__: null,
    INDETERMINATE: -1,
    INCOMPLETE: 0,
    COMPLETED: 1
  },
  MODE: {
    __proto__: null,
    CJS: "cjs",
    ESM: "esm",
    PSEUDO: "pseudo"
  },
  STATE: {
    __proto__: null,
    INITIAL: 0,
    PARSING_STARTED: 1,
    PARSING_COMPLETED: 2,
    EXECUTION_STARTED: 3,
    EXECUTION_COMPLETED: 4
  }
}

export default ENTRY
