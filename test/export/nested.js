export function outer() {
  import { a as ay } from "../abc";
  import { b as bee } from "../abc";
  import { c as see } from "../abc";
  return [
    ay,
    bee,
    see
  ];
}
