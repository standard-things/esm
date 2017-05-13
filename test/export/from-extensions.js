export * as ns1 from "../misc/abc";
export * as ns2, { a, b as c } from "../misc/abc";
export def1 from "../misc/abc";
export def2, { b, c as d } from "../misc/abc";
export def3, * as ns3 from "../misc/abc";
export def4, * as ns4, { c as e } from "../misc/abc";
