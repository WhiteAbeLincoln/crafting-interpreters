import { DiscriminateUnion } from '../util';
import { TokenType } from './token-type';

export interface TokenBase<T extends TokenType> {
  readonly type: T
  readonly lexeme: string
  readonly line: number
}

export interface TokenLiteral<T extends TokenType, V> extends TokenBase<T> {
  readonly literal: V
}

export type LiteralTokens = TokenLiteral<'STRING', string> | TokenLiteral<'NUMBER', number>
export type LitTokenTypes = LiteralTokens['type']
export type RegTokenTypes = Exclude<TokenType, LitTokenTypes>
export type Token = TokenBase<RegTokenTypes> | LiteralTokens

export type GetTok<T extends Token['type']> = DiscriminateUnion<Token, 'type', T>
export type GetLit<T extends LitTokenTypes> = DiscriminateUnion<LiteralTokens, 'type', T>['literal']

export function token<T extends LitTokenTypes>(
  type: T,
  lexeme: string,
  line: number,
  literal: GetLit<T>
): GetTok<T>
export function token<T extends RegTokenTypes>(
  type: T,
  lexeme: string,
  line: number
): GetTok<T>
export function token<T extends TokenType>(
  type: T,
  lexeme: string,
  line: number,
  literal: T extends LitTokenTypes ? GetLit<T> : undefined
): GetTok<T>
export function token<T extends TokenType>(
  type: T,
  lexeme: string,
  line: number,
  literal?: any
) {
  if (arguments.length === 3) {
    return { type, lexeme, line } as DiscriminateUnion<Token, 'type', T>
  }
  return { type, lexeme, line, literal } as DiscriminateUnion<Token, 'type', T>
}

export function toString(token: Token) {
  return token.lexeme;
}
