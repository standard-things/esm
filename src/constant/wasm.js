const WASM = {
  // The encoding of a WASM module starts with a 4-byte magic cookie.
  // https://webassembly.github.io/spec/core/binary/modules.html#binary-module
  MAGIC_COOKIE: "\0asm"
}

export default WASM
