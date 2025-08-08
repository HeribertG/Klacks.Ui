/**
 * Class representing a stack structure stored in the browser's localStorage.
 */
export class LocalStorageStack {
  static readonly KEY = 'MY_STACK';
}

//Pushes a new value onto the stack if it's not a duplicate of the last element.
export function pushOnStack(value: string): void {
  const tmpStack = getStack();
  if (value && !isLastElementDuplicate(value, tmpStack)) {
    tmpStack.push(value);
    setStack(tmpStack);
  }
}

//Pops the last value from the stack and returns it.
export function popFromStack(): string {
  let result = '';
  const tmpStack = getStack();
  if (tmpStack && tmpStack.length > 0) {
    result = tmpStack.pop()!;
    setStack(tmpStack);
  }
  return result;
}

export function countItemInStack(): number {
  let result = 0;
  const tmpStack = getStack();
  result = tmpStack.length;
  return result;
}

export function deleteStack(): void {
  localStorage.removeItem(LocalStorageStack.KEY);
}

// Checks if the last element in the stack is a duplicate of the provided data.
function isLastElementDuplicate(data: string, stack: string[]): boolean {
  if (!data) {
    return false;
  }
  if (stack.length === 0) {
    return false;
  }
  return stack[stack.length - 1] === data;
}

function getStack(): string[] {
  const stack = localStorage.getItem(LocalStorageStack.KEY);
  return deserializeStack(stack!) as string[];
}

function setStack(data: string[]): void {
  localStorage.setItem(LocalStorageStack.KEY, serializeStack(data));
}

function deserializeStack(data: string): string[] {
  if (data) {
    const result = JSON.parse(data);
    if (Array.isArray(result)) {
      return result;
    } else {
      console.error(
        'LocalStorageStack ',
        data,
        'The stored data is not a valid array.'
      );
      return [];
    }
  } else {
    return [];
  }
}

function serializeStack(data: string[]): string {
  return JSON.stringify(data);
}
