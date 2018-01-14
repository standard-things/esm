export class A {
  constructor() {
    import("./a.mjs")
  }
}

export const a = () => {
  import("./a.mjs")
}

export default function () {
  import("./a.mjs")
}
