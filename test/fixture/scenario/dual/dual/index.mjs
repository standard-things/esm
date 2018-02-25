import sub from "./sub"

try {
  sub()
  throw new Error("should not run sub.js")
} catch (e) {}
