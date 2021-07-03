import type { DiscriminateUnion } from '../util/types'

export type TokenType =
  // Single-character tokens.
  'LEFT_PAREN' | 'RIGHT_PAREN' |
  'LEFT_BRACE' | 'RIGHT_BRACE' |
  'COMMA'      | 'DOT'         |
  'MINUS'      | 'PLUS'        |
  'SEMICOLON'  | 'SLASH'       |
  'STAR'       |

  // One or two character tokens.
  'BANG'    | 'BANG_EQUAL'    |
  'EQUAL'   | 'EQUAL_EQUAL'   |
  'GREATER' | 'GREATER_EQUAL' |
  'LESS'    | 'LESS_EQUAL'    |

  // Literals.
  'IDENTIFIER' | 'STRING' |
  'NUMBER'     |

  // Keywords.
  'AND'   | 'CLASS'  | 'ELSE'  |
  'FALSE' | 'FUN'    | 'FOR'   |
  'IF'    | 'NIL'    | 'OR'    |
  'PRINT' | 'RETURN' | 'SUPER' |
  'THIS'  | 'TRUE'   | 'VAR'   |
  'WHILE' |

  'EOF'

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
export type Token = { [T in RegTokenTypes]: TokenBase<T> }[RegTokenTypes] | LiteralTokens

export type GetTok<T extends Token['type']> = DiscriminateUnion<Token, 'type', T>
export type GetLit<T extends LitTokenTypes> = DiscriminateUnion<LiteralTokens, 'type', T>['literal']
