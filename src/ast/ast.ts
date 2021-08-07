import type { GetPhantomType } from '../util/types'
import type { TokenBase } from '../scanner/token-type'
import { tagged, t } from '../util/util'

export type UnOpTokens = TokenBase<'MINUS' | 'BANG'>
export type BinOpTokens = TokenBase<
                        | 'EQUAL_EQUAL' | 'BANG_EQUAL'
                        | 'LESS'        | 'LESS_EQUAL'
                        | 'GREATER'     | 'GREATER_EQUAL'
                        | 'PLUS'        | 'MINUS'
                        | 'STAR'        | 'SLASH'
                        >
export type LogicalOpTokens = TokenBase<'AND' | 'OR'>

export type ExpressionValue = string | number | boolean | null
export const Expr = tagged(E => ({
  Literal: { value: t<ExpressionValue>() },
  Unary: { expr: E, op: t<UnOpTokens>() },
  Binary: { left: E, right: E, op: t<BinOpTokens>() },
  Grouping: { expr: E },
  Variable: { name: t<TokenBase<'IDENTIFIER'>>() },
  Assign: { name: t<TokenBase<'IDENTIFIER'>>(), value: E },
  Logical: { left: E, right: E, op: t<LogicalOpTokens>() }
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
  Continue: { label: t<TokenBase<'IDENTIFIER'> | null>() }
}))

export type Statement = GetPhantomType<typeof Stmt>
