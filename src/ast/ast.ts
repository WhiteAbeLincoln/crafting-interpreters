import Token, { TokenBase } from '../scanner/token'
import { tagged, GetPhantomType, t } from '../util'

export type UnOpTokens = TokenBase<'MINUS' | 'BANG'>
export type BinOpTokens = TokenBase<
                        | 'EQUAL_EQUAL' | 'BANG_EQUAL'
                        | 'LESS'        | 'LESS_EQUAL'
                        | 'GREATER'     | 'GREATER_EQUAL'
                        | 'PLUS'        | 'MINUS'
                        | 'STAR'        | 'SLASH'
                        >

export const Expr = tagged(E => ({
  Literal: { value: t<string|number|boolean|null>() },
  Unary: { expr: E, op: t<UnOpTokens>() },
  Binary: { left: E, right: E, op: t<BinOpTokens>() },
  Grouping: { expr: E },
  Variable: { name: t<Token>() }
}))

export type Expression = GetPhantomType<typeof Expr>

export const Stmt = tagged({
  Expression: { value: t<Expression>() },
  Print: { expr: t<Expression>() },
  Variable: { name: t<Token>(), initializer: t<Expression|null>() },
})

export type Statement = GetPhantomType<typeof Stmt>
