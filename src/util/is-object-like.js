export default function isObjectLike(value) {
  const type = typeof value
  return type === "function" || (type === "object" && value !== null)
}
