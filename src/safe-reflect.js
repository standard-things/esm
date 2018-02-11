import SafeBuiltin from "./safe-builtin.js"

export default typeof Reflect === "object" && Reflect !== null
  ? SafeBuiltin.create(Reflect)
  : null
