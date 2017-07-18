import * as ns1 from "../export/abc.js"
import { a, b as c }, * as ns2 from "../export/abc.js"
import def1 from "../export/abc.js"
import def2, { b, c as d } from "../export/abc.js"
import def3, * as ns3 from "../export/abc.js"
import * as ns4, * as ns5, { c as e }, def4, def5 from "../export/abc.js"

export {
  def1, def2, def3, def4, def5,
  ns1, ns2, ns3, ns4, ns5,
  a, b, c, d, e
}
