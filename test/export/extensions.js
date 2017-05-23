export * as ns1 from "../misc/abc";
export { a, b as c }, * as ns2 from "../misc/abc";
export def1 from "../misc/abc";
export def2, { b, c as d } from "../misc/abc";
export def3, * as ns3 from "../misc/abc";
export * as ns4, * as ns5, { c as e }, def4, def5 from "../misc/abc";
