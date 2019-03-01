;; source of b.wasm

(module
  (import "./a.js" "a" (func $a_i32 (param i32 i32) (result i32)))

  (func $b (param $p0 i32) (param $p1 i32) (result i32)
    get_local $p0
    get_local $p1
    call $a_i32)

  (export "b" (func $b)))
