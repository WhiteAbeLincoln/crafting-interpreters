import type {
  Assert,
  DiscriminatingKeys,
  MustInclude,
  Fn,
  GetPhantomType,
  TaggedConstructors,
  TaggedMatcher,
  TaggedUnion,
  Equal,
} from './types'

export const useDeferred = <T = never>(): readonly [
  promise: Promise<T>,
  resolve: (value: T | PromiseLike<T>) => void,
  reject: (err?: any) => void
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
  type TReflect = typeof Reflect
  type CorrectParams<Ps extends any[]> = Ps extends [any, any, ...any[]]
    ? [Ps[0]] extends [object]
      ? [Ps[1]] extends [PropertyKey]
        ? 1
        : 0
      : 0
    : 0
  type WrappedKeys = Exclude<
    {
      [k in keyof TReflect]: CorrectParams<Parameters<TReflect[k]>> extends 1
        ? k
        : never
    }[keyof TReflect],
    'apply'
  >
  const handler =
    <K extends WrappedKeys>(k: K): TReflect[K] =>
    (target: object, key: PropertyKey, ...rest: any[]) => {
      if (Reflect.has(target, key)) {
        return (Reflect[k] as any)(target, key, ...rest)
      }
      return (Reflect[k] as any)(getHandler(), key, ...rest)
    }
  return {
    defineProperty: handler('defineProperty'),
    deleteProperty: handler('deleteProperty'),
    get: handler('get'),
    getOwnPropertyDescriptor: handler('getOwnPropertyDescriptor'),
    has: handler('has'),
    ownKeys: target => {
      return [...Reflect.ownKeys(target), ...Reflect.ownKeys(getHandler())]
    },
    set: handler('set'),
  }
}

export class SingletonHandler<T extends object> {
  private handler: T | undefined = undefined
  private constructor(private name: string) {}
  static Create<T extends object>(
    name: string
  ): SingletonHandler<T> & Omit<T, 'setHandler' | 'getHandler'> {
    const singleton = new SingletonHandler<T>(name)
    const proxied = new Proxy(
      singleton,
      wrappingProxyHandler(() => singleton.getHandler())
    )
    return proxied as SingletonHandler<T> & Omit<T, 'setHandler' | 'getHandler'>
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

export const neg = <T>(v: T) => -v
export const gt = <T>(a: T, b: T) => a > b
export const ge = <T>(a: T, b: T) => a >= b
export const lt = <T>(a: T, b: T) => a < b
export const le = <T>(a: T, b: T) => a <= b
export const sub = (a: number, b: number) => a - b
export const div = (a: number, b: number) => a / b
export const mul = (a: number, b: number) => a * b

export const mustInclude =
  <T extends keyof any>() =>
  <U extends [T, ...T[]]>(...entries: MustInclude<T, U>): MustInclude<T, U> =>
    entries

type ObjBuilder<
  T extends Record<PropertyKey, any>,
  Ks extends (keyof T)[]
> = Fn<
  {
    [k in keyof Ks]: T[Assert<Ks[k], keyof T>]
  },
  Pick<T, Ks[number]>
>

export const objBuilder =
  <T extends Record<PropertyKey, any>>() =>
  <Ks extends (keyof T)[]>(...keys: Ks): ObjBuilder<T, Ks> => {
    const fn: ObjBuilder<T, Ks> = (...args: any[]) =>
      // `args` should have same length as `keys` if the typing worked
      // however, when used in a call position args may have more than keys
      // or less if some keys are optional - so we iterate over keys
      // if args.length > keys.length, no problem
      // if args.length < keys.length, then accessing past end of args will give
      // us undefined which is the behavior we want
      keys.reduce((o, k, i) => {
        const v = args[i]
        o[k] = v
        return o
      }, {} as Pick<T, Ks[number]>)

    // we need to set the length property for curry to work
    Object.defineProperty(fn, 'length', { value: keys.length })

    return fn
  }

export function matcher<Union extends { kind: PropertyKey }>(): TaggedMatcher<
  Union,
  'kind'
>
export function matcher<
  Union,
  Key extends keyof Union = DiscriminatingKeys<Union>
>(key: Key): TaggedMatcher<Union, Key>
export function matcher<
  Union,
  Key extends keyof Union = DiscriminatingKeys<Union>
>(key: Key = 'kind' as Key): TaggedMatcher<Union, Key> {
  return ((m: Record<Union[Key] & PropertyKey, any>) => v =>
    m[v[key] as Union[Key] & PropertyKey](v)) as TaggedMatcher<Union, Key>
}

/**
 * Store a type as a value using phantom tags
 */
export function t<T>(): void & { __type: T } {
  return undefined as void & { __type: T }
}

type TaggedRef = { readonly k: unique symbol }['k']
type UnionBase = Record<
  PropertyKey,
  Record<PropertyKey, (void & { __type: unknown }) | TaggedRef>
>
type ReplaceTypeOnce<T, Match, R> = Equal<T, Match> extends '1' ? R : T
type ReplaceType<T, Match, R> =
  T extends object
    ? { [k in keyof T]: ReplaceType<T[k], Match, R> }
    : ReplaceTypeOnce<T, Match, R>

type MkTagged<Def extends UnionBase, Key extends PropertyKey> = TaggedUnion<
  {
    [k in keyof Def]: {
      [p in keyof Def[k]]: Def[k][p] extends TaggedRef
        ? MkTagged<Def, Key>
        : ReplaceType<GetPhantomType<Def[k][p]>, TaggedRef, MkTagged<Def, Key>>
    }
  },
  Key
>
type TaggedResult<
  Def extends UnionBase,
  Key extends PropertyKey,
  U = MkTagged<Def, Key>,
  UK extends keyof U = Assert<Key, keyof U>
> = {
  __type: U
  match: TaggedMatcher<U, UK>
} & TaggedConstructors<U, UK>

export function tagged<
  UnionDef extends UnionBase,
  Key extends PropertyKey = 'kind'
>(def: UnionDef | ((U: TaggedRef) => UnionDef)): TaggedResult<UnionDef, Key>
export function tagged<UnionDef extends UnionBase, Key extends PropertyKey>(
  def: UnionDef | ((U: TaggedRef) => UnionDef),
  key: Key
): TaggedResult<UnionDef, Key>
export function tagged<
  UnionDef extends UnionBase
>(
  def: UnionDef | ((U: TaggedRef) => UnionDef),
  key: PropertyKey = 'kind'
): TaggedResult<UnionDef, PropertyKey> {
  const unionDef = typeof def === 'function' ? def(undefined as any) : def
  type Res = TaggedResult<UnionDef, PropertyKey>
  type U = Res['__type']
  const base = {
    __type: undefined as unknown as U,
    match: matcher<U, keyof U>(key),
  }

  return Object.keys(unionDef).reduce((acc, k) => {
    acc[k as keyof Res] = ((data: any) => ({ ...data, [key]: k })) as any
    return acc
  }, base as unknown as Res)
}
