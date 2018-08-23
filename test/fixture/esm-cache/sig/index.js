import process, { argv, exit, stdout } from "process"

const [,,signal] = argv

process.on(signal, () =>
  stdout.write(`sig-on-${signal}`)
)

stdout.on("data", (data) => {
  if (data.toString("utf8") === "exit") {
    exit()
  }
})

let once = false

setInterval(() => {
  if (! once) {
    once = true
    stdout.write(`sig-interval-${signal}`)
  }
}, 1000)

stdout.write(`sig-run-${signal}`)
