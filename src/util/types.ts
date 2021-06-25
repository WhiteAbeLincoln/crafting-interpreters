export type Matches<A, B> = [A] extends [B] ? '1' : '0'
export type And<A, B> = A extends '1' ? (B extends '1' ? '1' : '0') : '0'
export type Equal<A, B> = And<Matches<A, B>, Matches<B, A>>

export type Assert<T, V> = T extends V ? T : never
export type Fn<Args extends any[], R> = (...args: Args) => R

export type Refinement<A, B extends A> = (a: A) => a is B
export type Assertion<A, B extends A> = (a: A) => asserts a is B

export type UnionToIntersection<U> = (
  U extends any ? (arg: U) => any : never
) extends (arg: infer I) => void
  ? I
  : never

/**
 * WARNING: typescript has no internal order for unions
 * do not rely on this as it is not deterministic between builds
 *
 * Instead use properties that are invariant to ordering, such as length
 */
type UnionToTuple<T> = UnionToIntersection<
  T extends any ? (t: T) => T : never
> extends (_: any) => infer W
  ? [...UnionToTuple<Exclude<T, W>>, W]
  : []

/** Gets the number of unique members of a union */
export type UnionLength<Union> = UnionToTuple<Union>['length']

type _DiscriminatingKeys<
  Union,
  Keys extends keyof Union = keyof Union,
  Len = UnionLength<Union>
> = {
  [k in Keys]: Equal<UnionLength<Union[k]>, Len> extends '1' ? k : never
}[Keys]

/**
 * Gets the keys of a union which discriminate
 *
 * Does not work if a discriminating key uses boolean values
 */
export type DiscriminatingKeys<Union> = _DiscriminatingKeys<Union>

/** Discriminates a tagged union given tag key and value */
export type DiscriminateUnion<
  Union,
  TagKey extends keyof Union,
  TagValue extends Union[TagKey]
> = Union extends Record<TagKey, TagValue> ? Union : never

/** Creates a discriminated union given record of cases and a tag key */
export type TaggedUnion<
  U extends Record<PropertyKey, {}>,
  Key extends PropertyKey = 'kind'
> = { [k in keyof U]: { [v in Key]: k } & U[k] }[keyof U]

type MatcherCases<
  Union,
  TagKey extends keyof Union,
  TagValue extends Union[TagKey] & PropertyKey,
  T
> = {
  [k in TagValue]: (
    value: Omit<DiscriminateUnion<Union, TagKey, k>, TagKey>
  ) => T
}
export type TaggedMatcher<Union, TagKey extends keyof Union> = [Union] extends [
  Record<TagKey, PropertyKey>
]
  ? <T>(
      matcher: MatcherCases<Union, TagKey, Union[TagKey] & PropertyKey, T>
    ) => (e: Union) => T
  : never

export type TaggedConstructors<Union, TagKey extends keyof Union> = [
  Union
] extends [Record<TagKey, PropertyKey>]
  ? {
      [k in Union[TagKey]]: (
        data: Omit<DiscriminateUnion<Union, TagKey, k>, TagKey>
      ) => Union
    }
  : never

export type ValueOf<T> = T extends any[] ? T[number] : never
export type Union<T, U> = T | U
export type Intersection<T, U> = T & U
export type DisjunctiveUnion<T, U> = Exclude<Union<T, U>, Intersection<T, U>>
export type MissingMembers<All, T> = Exclude<All, T & All>
// from https://github.com/microsoft/TypeScript/issues/13298#issuecomment-654906323
export type TemplateLiteralValues =
  | string
  | number
  | bigint
  | boolean
  | null
  | undefined
export type MapReplace<U, V> = { [k in keyof U]: V }
export type MustInclude<T, U extends T[]> = [T] extends [ValueOf<U>]
  ? U
  : DisjunctiveUnion<T, ValueOf<U>> extends TemplateLiteralValues
  ? [`ERROR Missing: ${DisjunctiveUnion<T, ValueOf<U>>}`, ...never[]]
  : never

export type GetPhantomType<T> = Matches<undefined, T> extends '1'
  ? never
  : [T] extends [{ __type: infer A }]
  ? Equal<A, unknown> extends '1'
    ? never
    : A
  : never
