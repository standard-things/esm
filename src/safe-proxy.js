import SafeBuiltin from "./safe-builtin.js"

export default typeof Proxy === "function"
  ? SafeBuiltin.create(Proxy)
  : null
