function a() {
  arguments
}

const b = function () {
  arguments
}

const c = {
  c() {
    arguments
  }
}

a()
b()
c.c()
