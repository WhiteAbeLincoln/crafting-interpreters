import { GetLit, GetTok, LitTokenTypes, RegTokenTypes, Token, token } from './token'
import { TokenType } from './token-type'
import { error } from '../errors/errors'

export class Scanner {
  private keywords: Readonly<Record<string, TokenType>> = {
    "and": 'AND',
    "class":  'CLASS',
    "else":   'ELSE',
    "false":  'FALSE',
    "for":    'FOR',
    "fun":    'FUN',
    "if":     'IF',
    "nil":    'NIL',
    "or":     'OR',
    "print":  'PRINT',
    "return": 'RETURN',
    "super":  'SUPER',
    "this":   'THIS',
    "true":   'TRUE',
    "var":    'VAR',
    "while":  'WHILE',
  }
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
