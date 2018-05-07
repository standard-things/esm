export default async function convert(iterable) {
  const result = []

  for await (const value of iterable) {
    result.push(value)
  }

  return result
}
