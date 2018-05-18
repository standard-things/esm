import { B } from "./b.mjs"

B.A()

export class A {
  static B() {
    return B
  }
}
