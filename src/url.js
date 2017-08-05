import ns from "url"

const Url = ns.Url

class URL extends Url {
  constructor(input) {
    super(input)
    super.parse(input)
  }
}

Object.setPrototypeOf(URL.prototype, Url.prototype)

export default ns.URL || URL
