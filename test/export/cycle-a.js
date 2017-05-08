function fun() {
  return true;
}

import { callFun } from "./cycle-b";

export default callFun();

export { fun };
