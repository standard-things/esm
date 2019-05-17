import branch from "./branch.js"
import shared from "../shared.js"

function init() {
  function lookahead(parser) {
    const branched = branch(parser)

    branched.next()

    return branched
  }

  return lookahead
}

export default shared.inited
  ? shared.module.parseLookahead
  : shared.module.parseLookahead = init()
