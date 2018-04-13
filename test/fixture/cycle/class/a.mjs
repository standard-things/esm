import B from "./b.mjs"

export function a() {
  // Assignment expression.
  const a = new B()
  // Expression statement.
  new B()
  // Return statement.
  return new B()
}

a()
