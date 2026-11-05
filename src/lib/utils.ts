export type ClassValue = string | false | null | undefined | ClassValue[]

export function cn(...inputs: ClassValue[]): string {
  return appendClasses(inputs, "")
}

function appendClasses(inputs: ClassValue[], classes: string): string {
  for (let index = 0; index < inputs.length; index++) {
    const input = inputs[index]
    if (Array.isArray(input)) classes = appendClasses(input, classes)
    else if (input) classes += classes ? " " + input : input
  }
  return classes
}
