export const useDeferred = <T = never>(): readonly [
  promise: Promise<T>,
  resolve: (value: T | PromiseLike<T>) => void,
  reject: (err?: any) => void,
] => {
  let resolve: (value: T | PromiseLike<T>) => void
  let reject: (err?: any) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return [promise, resolve!, reject!] as const
}

export const wrappingProxyHandler = <T extends object, E extends object>(
  getHandler: () => E
): ProxyHandler<T> => {
  type TReflect = typeof Reflect;
  type CorrectParams<Ps extends any[]> = Ps extends [any, any, ...any[]]
    ? [Ps[0]] extends [object]
      ? [Ps[1]] extends [PropertyKey]
        ? 1
        : 0
      : 0
    : 0;
  type WrappedKeys = Exclude<
    {
      [k in keyof TReflect]: CorrectParams<Parameters<TReflect[k]>> extends 1
        ? k
        : never;
    }[keyof TReflect],
    "apply"
  >;
  const handler = <K extends WrappedKeys>(k: K): TReflect[K] => (
    target: object,
    key: PropertyKey,
    ...rest: any[]
  ) => {
    if (Reflect.has(target, key)) {
      return (Reflect[k] as any)(target, key, ...rest);
    }
    return (Reflect[k] as any)(getHandler(), key, ...rest);
  };
  return {
    defineProperty: handler("defineProperty"),
    deleteProperty: handler("deleteProperty"),
    get: handler("get"),
    getOwnPropertyDescriptor: handler("getOwnPropertyDescriptor"),
    has: handler("has"),
    ownKeys: (target) => {
      return [...Reflect.ownKeys(target), ...Reflect.ownKeys(getHandler())];
    },
    set: handler("set"),
  };
};

export class SingletonHandler<T extends object> {
  private handler: T | undefined = undefined
  private constructor(private name: string) {}
  static Create<T extends object>(name: string): SingletonHandler<T> & Omit<T, 'setHandler'|'getHandler'> {
    const singleton = new SingletonHandler<T>(name)
    const proxied = new Proxy(singleton, wrappingProxyHandler(() => singleton.getHandler()))
    return proxied as SingletonHandler<T> & Omit<T, 'setHandler'|'getHandler'>
  }
  setHandler(handler: T) {
    this.handler = handler
  }
  getHandler(): T {
    if (!this.handler) {
      throw new Error(`Need to register a handler for ${this.name}`)
    }
    return this.handler
  }
}

/** Discriminates a tagged union given tag key and value */
export type DiscriminateUnion<
  Union,
  TagKey extends keyof Union,
  TagValue extends Union[TagKey]
> = Union extends Record<TagKey, TagValue> ? Union : never

export const neg = <T>(v: T) => -v
export const gt = <T>(a: T, b: T) => a > b
export const ge = <T>(a: T, b: T) => a >= b
export const lt = <T>(a: T, b: T) => a < b
export const le = <T>(a: T, b: T) => a <= b
export const sub = (a: number, b: number) => a - b
export const div = (a: number, b: number) => a / b
export const mul = (a: number, b: number) => a * b

export type Refinement<A, B extends A> = (a: A) => a is B
export type Assertion<A, B extends A> = (a: A) => asserts a is B
