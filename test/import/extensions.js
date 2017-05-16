import * as ns1 from "../misc/abc";
import { a, b as c }, * as ns2 from "../misc/abc";
import def1 from "../misc/abc";
import def2, { b, c as d } from "../misc/abc";
import def3, * as ns3 from "../misc/abc";
import * as ns4, { c as e }, def4 from "../misc/abc";

export {
  def1, def2, def3, def4,
  ns1, ns2, ns3, ns4,
  a, b, c, d, e
};
