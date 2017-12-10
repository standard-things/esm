async function* gen() {
  yield "a"
  yield "b"
}

export default async () => {
  const items = []

  for await (const item of gen()) {
    items.push(item)
  }

  return items
}
