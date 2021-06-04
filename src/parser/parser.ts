import { Expression, binary, unary, literal, grouping } from '../ast/ast'
import TokenType from '../scanner/token-type'
import Token, { GetTok, error } from '../scanner/token'

class ParseError extends Error {}

export class Parser {
  private current = 0;
  constructor(private tokens: Token[]) {}

  parse(): Expression | null {
    try {
      return this.expression()
    } catch (err) {
      if (err instanceof ParseError) {
        return null
      }
      throw err
    }
  }

  private expression(): Expression {
    return this.equality()
  }

  private equality(): Expression {
    let expr = this.comparison()

    this.whileMatching('BANG_EQUAL', 'EQUAL_EQUAL', operator => {
      const right = this.comparison()
      expr = binary(expr, operator, right)
    })

    return expr
  }

  private comparison(): Expression {
    let expr = this.term()

    this.whileMatching('GREATER', 'GREATER_EQUAL', 'LESS', 'LESS_EQUAL', operator => {
      const right = this.term()
      expr = binary(expr, operator, right)
    })

    return expr
  }

  private term(): Expression {
    let expr = this.factor()

    this.whileMatching('MINUS', 'PLUS', operator => {
      const right = this.factor()
      expr = binary(expr, operator, right)
    })

    return expr
  }

  private factor(): Expression {
    let expr = this.unary()

    this.whileMatching('SLASH', 'STAR', operator => {
      const right = this.unary()
      expr = binary(expr, operator, right)
    })

    return expr;
  }

  private unary(): Expression {
    const operator = this.match('BANG', 'MINUS')
    if (operator) {
      const right = this.unary()
      return unary(operator, right)
    }

    return this.primary()
  }

  private primary(): Expression {
    if (this.match('FALSE')) return literal(false)
    if (this.match('TRUE')) return literal(true)
    if (this.match('NIL')) return literal(null)

    {
      const lit = this.match('NUMBER', 'STRING')
      if (lit) return literal(lit.literal)
    }

    if (this.match('LEFT_PAREN')) {
      const expr = this.expression();
      this.consume('RIGHT_PAREN', "Expected ')' after expression.")
      return grouping(expr)
    }

    throw this.error(this.peek(), 'Expect expression.')
  }

  private match<Toks extends TokenType>(...types: Toks[]): GetTok<Toks> | null {
    if (types.some(type => this.check(type))) {
      return this.advance() as GetTok<Toks>
    }

    return null
  }

  private whileMatching<Toks extends TokenType>(...args: [...types: Toks[], fn: (matched: GetTok<Toks>) => void]): void {
    const types = args.slice(0, args.length - 1) as Toks[]
    const fn = args[args.length - 1] as (matched: GetTok<Toks>) => void

    for (let matched: GetTok<Toks> | null = null; (matched = this.match(...types)) !== null;) {
      fn(matched)
    }
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false
    return this.peek().type == type;
  }

  private advance(): Token {
    const curr = this.peek();
    if (!this.isAtEnd()) this.current++
    return curr
  }

  private isAtEnd(): boolean {
    return this.peek().type == 'EOF'
  }

  private peek(): Token {
    const tok = this.tokens[this.current]
    if (!tok) { throw new Error('Fatal failure in parser - token idx out of bounds') }
    return tok
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance()

    throw this.error(this.peek(), message)
  }

  private error(token: Token, message: string) {
    error(token, message)
    return new ParseError()
  }

  // we don't use synchronize yet
  // @ts-expect-error
  private synchronize(): void {
    let prev = this.advance();

    while (!this.isAtEnd()) {
      if (prev.type == 'SEMICOLON') return;

      switch (this.peek().type) {
        case 'CLASS':
        case 'FUN':
        case 'VAR':
        case 'FOR':
        case 'IF':
        case 'WHILE':
        case 'PRINT':
        case 'RETURN':
          return
      }

      prev = this.advance();
    }
  }
}
