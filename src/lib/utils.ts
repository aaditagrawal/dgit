export type ClassValue =
  | string
  | number
  | bigint
  | boolean
  | null
  | undefined
  | ClassValue[]
  | object

// Strings are the common component path. Only containers need recursive work.
export function cn(...inputs: ClassValue[]): string {
  let classes = ""
  for (let index = 0; index < inputs.length; index++) {
    const input = inputs[index]
    if (!input) continue
    // oxlint-disable-next-line anti-slop/no-runtime-typeof -- Decode the existing polymorphic class-value API at its boundary.
    if (typeof input === "string") {
      classes = classes ? `${classes} ${input}` : input
    } else {
      classes = appendClass(input, classes)
    }
  }
  return classes
}

function appendClass<T extends ClassValue>(input: T, classes: string): string {
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- Only string and number primitives contribute class text.
  if (typeof input === "string" || typeof input === "number") {
    const name = "" + input
    return name ? (classes ? classes + " " + name : name) : classes
  }
  if (Array.isArray(input)) {
    const length = input.length
    for (let index = 0; index < length; index++) {
      if (input[index]) classes = appendClass(input[index], classes)
    }
    // oxlint-disable-next-line anti-slop/no-runtime-typeof -- Conditional class maps include inherited enumerable keys, as before.
  } else if (input !== null && typeof input === "object") {
    const names = conditionalClasses(input)
    if (names) classes += classes ? " " + names : names
  }
  return classes
}

function conditionalClasses<T extends object>(input: T): string {
  let names = ""
  for (const name in input) {
    if (input[name]) names += names ? " " + name : name
  }
  return names
}
