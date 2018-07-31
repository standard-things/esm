async function* gen() {
  yield "a"
  yield "b"
}

export default async () => {
  const result = []

  for await (const value of gen()) {
    result.push(value)
  }

  return result
}
