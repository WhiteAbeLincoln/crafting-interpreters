import type { GetPhantomType } from '../util/types'
import type { TokenBase } from '../scanner/token-type'
import { tagged, t } from '../util/util'
import type { Environment } from '../environment/environment'

export type UnOpTokens = TokenBase<'MINUS' | 'BANG'>
export type BinOpTokens = TokenBase<
                        | 'EQUAL_EQUAL' | 'BANG_EQUAL'
                        | 'LESS'        | 'LESS_EQUAL'
                        | 'GREATER'     | 'GREATER_EQUAL'
                        | 'PLUS'        | 'MINUS'
                        | 'STAR'        | 'SLASH'
                        >
export type LogicalOpTokens = TokenBase<'AND' | 'OR'>

export type Callable = { arity: number, call: (env: Environment, args: ExpressionValue[]) => ExpressionValue, toString: () => string }
export type ExpressionValue = string | number | boolean | null | Callable

type CallableParams<T> = T extends (env: Environment, ...args: infer R) => ExpressionValue ? R : never
export function makeCallable<Fn extends (env: Environment, ...args: ExpressionValue[]) => ExpressionValue>(fn: Fn, arity: CallableParams<Fn>['length']): Callable {
  return { arity, call(env, args) { return fn(env, ...args) }, toString() { return `<native fn${fn.name ? ' ' + fn.name : ''}>` } }
}

export function isCallable(v: ExpressionValue): v is Callable {
  return typeof v === 'object' && v != null && typeof v.arity === 'number' && typeof v.call === 'function'
}

export const Expr = tagged(E => ({
  Literal: { value: t<ExpressionValue>() },
  Unary: { expr: E, op: t<UnOpTokens>() },
  Binary: { left: E, right: E, op: t<BinOpTokens>() },
  Grouping: { expr: E },
  Variable: { name: t<TokenBase<'IDENTIFIER'>>() },
  Assign: { name: t<TokenBase<'IDENTIFIER'>>(), value: E },
  Logical: { left: E, right: E, op: t<LogicalOpTokens>() },
  Call: { callee: E, args: t<Array<typeof E>>(), callToken: t<TokenBase<'RIGHT_PAREN'>>() },
}))

export type Expression = GetPhantomType<typeof Expr>

export const Stmt = tagged(S => ({
  Expression: { value: t<Expression>() },
  Print: { expr: t<Expression>() },
  Declaration: { name: t<TokenBase<'IDENTIFIER'>>(), initializer: t<Expression|null>() },
  Block: { statements: t<Array<typeof S>>() },
  Label: { label: t<string>(), stmt: S, },
  ContinuePoint: { label: t<string|undefined>(), stmt: S },
  If: { condition: t<Expression>(), thenBranch: S, elseBranch: t<typeof S | null>() },
  While: { condition: t<Expression>(), body: S },
  Break: { label: t<TokenBase<'IDENTIFIER'> | null>() },
  Continue: { label: t<TokenBase<'IDENTIFIER'> | null>() },
  Function: { name: t<TokenBase<'IDENTIFIER'>>(), params: t<TokenBase<'IDENTIFIER'>[]>(), body: t<Array<typeof S>>() },
  Return: { keyword: t<TokenBase<'RETURN'>>(), value: t<Expression>() }
}))

export type Statement = GetPhantomType<typeof Stmt>
