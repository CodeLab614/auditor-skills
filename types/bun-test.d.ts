declare module 'bun:test' {
  type MutableTuple<T extends readonly unknown[]> = [...T];

  interface TestFunction {
    (name: string, callback: (...args: unknown[]) => void | Promise<void>): void;
    each<T extends readonly unknown[]>(cases: readonly T[]): (
      name: string,
      callback: (...args: MutableTuple<T>) => void | Promise<void>,
    ) => void;
  }

  interface Matchers {
    toBe(expected: unknown): void;
    toBeNull(): void;
    toEqual(expected: unknown): void;
    toHaveLength(expected: number): void;
    toContain(expected: unknown): void;
    toThrow(expected?: string | RegExp): void;
    toMatchObject(expected: Record<string, unknown>): void;
    readonly not: Matchers;
    readonly rejects: Matchers;
  }

  interface DescribeFunction {
    (name: string, callback: () => void): void;
    skipIf(condition: boolean): (name: string, callback: () => void) => void;
  }

  export const describe: DescribeFunction;
  export const beforeEach: (callback: () => void | Promise<void>) => void;
  export const afterAll: (callback: () => void | Promise<void>) => void;
  export const test: TestFunction;
  export const expect: (actual: unknown) => Matchers;
}
