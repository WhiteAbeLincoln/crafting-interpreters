import type { GetPhantomType } from '../util/types'
import type { Token, TokenBase } from '../scanner/token-type'
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
  Variable: { name: t<Token>() },
  Assign: { name: t<Token>(), value: E },
  Logical: { left: E, right: E, op: t<LogicalOpTokens>() }
}))

export type Expression = GetPhantomType<typeof Expr>

export const Stmt = tagged(S => ({
  Expression: { value: t<Expression>() },
  Print: { expr: t<Expression>() },
  Declaration: { name: t<Token>(), initializer: t<Expression|null>() },
  Block: { statements: t<Array<typeof S>>() },
  If: { condition: t<Expression>(), thenBranch: S, elseBranch: t<typeof S | null>() },
  While: { condition: t<Expression>(), body: S }
}))

export type Statement = GetPhantomType<typeof Stmt>
