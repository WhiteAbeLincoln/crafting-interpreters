import { TokenBase } from '../scanner/token'
import { DiscriminateUnion } from '../util'

type AST<Kind extends string, Extra extends {} = {}> = { kind: Kind } & Extra

export type Expression = Literal
                       | Unary
                       | Binary
                       | Grouping

export type Literal = Num | Str | Bool | Nil

export type Str = AST<'literal', { value: string }>
export type Num = AST<'literal', { value: number }>
export type Bool = AST<'literal', { value: boolean }>
export type Nil = AST<'literal', { value: null }>

export type Unary = AST<'unary', { expr: Expression, op: UnOpTokens }>

export type Binary = AST<'binary', {
  left: Expression,
  right: Expression
  op: BinOpTokens
}>

export type Grouping = AST<'grouping', { expr: Expression }>

export type UnOpTokens = TokenBase<'MINUS' | 'BANG'>
export type BinOpTokens = TokenBase<
                        | 'EQUAL_EQUAL' | 'BANG_EQUAL'
                        | 'LESS'        | 'LESS_EQUAL'
                        | 'GREATER'     | 'GREATER_EQUAL'
                        | 'PLUS'        | 'MINUS'
                        | 'STAR'        | 'SLASH'
                        >

export function grouping(expr: Expression): Expression {
  return { kind: 'grouping', expr }
}
export function literal(value: string | number | boolean | null): Expression {
  return { kind: 'literal', value }
}
export function unary(op: UnOpTokens, expr: Expression): Expression {
  return { kind: 'unary', op, expr }
}
export function binary(left: Expression, op: BinOpTokens, right: Expression): Expression {
  return { kind: 'binary', left, op, right }
}
export function ast<K extends Expression['kind']>(kind: K, extra: Omit<DiscriminateUnion<Expression, 'kind', K>, 'kind'>): Expression {
  return { kind, ...extra } as DiscriminateUnion<Expression, 'kind', K>
}
