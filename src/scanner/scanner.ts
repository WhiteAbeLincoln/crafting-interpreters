import type { DiscriminateUnion, Matches } from '../util/types'
import type { GetLit, GetTok, Keywords, LitTokenTypes, RegTokenTypes, Token, TokenType } from './token-type'
import { error } from '../errors/errors'
import { invertRecord, static_assert } from '../util/util'

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

const keywordMap = {
  'AND': 'and',
  'CLASS': 'class',
  'ELSE': 'else',
  'FALSE': 'false',
  'FOR': 'for',
  'FUN': 'fun',
  'IF': 'if',
  'NIL': 'nil',
  'OR': 'or',
  'PRINT': 'print',
  'RETURN': 'return',
  'SUPER': 'super',
  'THIS': 'this',
  'TRUE': 'true',
  'VAR': 'var',
  'WHILE': 'while',
  'BREAK': 'break',
  'CONTINUE': 'continue',
} as const

static_assert<Matches<typeof keywordMap, Record<Keywords, string>>>();

export class Scanner {
  private keywords: Readonly<Record<string, Keywords>> = invertRecord(keywordMap);
  private readonly tokens: Token[] = [];
  private start = 0
  private current = 0
  private line = 1
  constructor(private readonly source: string) {}
  scanTokens(): Token[] {
    while (!this.isAtEnd()) {
      this.start = this.current
      this.scanToken()
    }
    this.tokens.push(token('EOF', "", this.line))
    return this.tokens
  }
  private isAtEnd(): boolean {
    return this.current >= this.source.length
  }
  private scanToken(): void {
    const c = this.advance()
    switch (c) {
      case '(': this.addToken('LEFT_PAREN'); break
      case ')': this.addToken('RIGHT_PAREN'); break
      case '{': this.addToken('LEFT_BRACE'); break
      case '}': this.addToken('RIGHT_BRACE'); break
      case ',': this.addToken('COMMA'); break
      case '.': this.addToken('DOT'); break
      case '-': this.addToken('MINUS'); break
      case '+': this.addToken('PLUS'); break
      case ';': this.addToken('SEMICOLON'); break
      case ':': this.addToken('COLON'); break
      case '*': this.addToken('STAR'); break
      case '!':
        this.addToken(this.match('=') ? 'BANG_EQUAL' : 'BANG')
        break
      case '=':
        this.addToken(this.match('=') ? 'EQUAL_EQUAL' : 'EQUAL')
        break
      case '<':
        this.addToken(this.match('=') ? 'LESS_EQUAL' : 'LESS')
        break
      case '>':
        this.addToken(this.match('=') ? 'GREATER_EQUAL' : 'GREATER')
        break
      case '/':
        if (this.match('/')) {
          while (this.peek() !== '\n' && !this.isAtEnd()) this.advance()
        } else {
          this.addToken('SLASH')
        }
        break
      case ' ':
      case '\r':
      case '\t':
        // Ignore whitespace.
        break;

      case '\n':
        this.line++;
        break;
      case '"': this.string(); break;
      default:
        if (this.isDigit(c)) {
          this.number()
        } else if (this.isAlpha(c)) {
          this.identifier()
        } else {
          error(this.line, "Unexpected Character.")
        }
        break
    }
  }
  private advance(): string {
    return this.source.charAt(this.current++)
  }
  private addToken<T extends LitTokenTypes>(type: T, literal: GetLit<T>): GetTok<T>
  private addToken<T extends RegTokenTypes>(type: T): GetTok<T>
  private addToken<T extends TokenType>(type: T, literal?: any): GetTok<T>
  private addToken<T extends TokenType>(type: T, literal?: any): GetTok<T> {
    const text = this.source.substring(this.start, this.current)
    const tok = token(type, text, this.line, literal);
    this.tokens.push(tok)
    return tok
  }
  private peek(): string {
    if (this.isAtEnd()) return '\0'
    return this.source.charAt(this.current)
  }
  private match(expected: string): boolean {
    // match combines peek and advance
    if (this.peek() !== expected) return false
    this.advance()
    return true
  }
  private string() {
    while (this.peek() != '"' && !this.isAtEnd()) {
      if (this.peek() == '\n') this.line++;
      this.advance();
    }

    if (this.isAtEnd()) {
      error(this.line, "Unterminated string.");
      return;
    }

    // The closing ".
    this.advance();

    // Trim the surrounding quotes.
    const value = this.source.substring(this.start + 1, this.current - 1);
    this.addToken('STRING', value);
  }
  private isDigit(c: string) {
    return /^[0-9]$/.test(c)
  }
  private number() {
    while (this.isDigit(this.peek())) this.advance()
    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      this.advance()
      while (this.isDigit(this.peek())) this.advance()
    }

    this.addToken('NUMBER', Number.parseFloat(this.source.substring(this.start, this.current)))
  }
  private peekNext() {
    if (this.current + 1 >= this.source.length) return '\0'
    return this.source.charAt(this.current + 1)
  }
  private identifier() {
    while (this.isAlphaNumeric(this.peek())) this.advance()
    const text = this.source.substring(this.start, this.current)
    const type = this.keywords[text] ?? 'IDENTIFIER'
    this.addToken(type)
  }
  private isAlpha(c: string) {
    return /^[A-Za-z_]$/.test(c)
  }
  private isAlphaNumeric(c: string) {
    return this.isAlpha(c) || this.isDigit(c)
  }
}
