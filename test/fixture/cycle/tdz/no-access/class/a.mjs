import { B } from "./b.mjs"

export class A {
  static B() {
    return B
  }
}

B.A()
