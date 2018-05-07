export class A {
  a
}

export class B {
  b = "b"
}

export class C {
  #c
}

export class D {
  #d= "d"
  d() {
    return this.#d
  }
}

export class E {
  async
}

export class F {
  get
}

export class G {
  set
}

export class H {
  static
}

export class I {
 async = 1;
 get = 1
 set = 1
 static = 1
}
