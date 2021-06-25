import { Expression, Expr, Statement, Stmt } from '../ast/ast'
import TokenType from '../scanner/token-type'
import Token, { GetTok, error } from '../scanner/token'

class ParseError extends Error {}

export class Parser {
  private current = 0;
  constructor(private tokens: Token[]) {}

  parse(): Statement[] {
    const statements: Statement[] = []
    while (!this.isAtEnd()) {
      statements.push(this.declaration())
    }

    return statements
  }

  private declaration(): Statement {
    try {
      if (this.match('VAR')) return this.varDeclaration()
    } catch (err) {
      if (err instanceof ParseError) {
        this.synchronize()
        return null
      } else {
        throw err
      }
    }
  }

  private varDeclaration(): Statement {
    const name = this.consume('IDENTIFIER', "Expect variable name.")
    const initializer = this.match('EQUAL') ? this.expression() : null
    this.consume('SEMICOLON', "Expect ';' after variable declaration.")
    return Stmt.Variable({ name, initializer })
  }

  private statement(): Statement {
    if (this.match('PRINT')) return this.printStatement()

    return this.expressionStatement()
  }

  private printStatement(): Statement {
    const value = this.expression()
    this.consume('SEMICOLON', "Expect ';' after value.")
    return Stmt.Print({ expr: value })
  }

  private expressionStatement(): Statement {
    const value = this.expression()
    this.consume('SEMICOLON', "Expect ';' after expression.")
    return Stmt.Expression({ value })
  }

  private expression(): Expression {
    return this.equality()
  }

  private equality(): Expression {
    let expr = this.comparison()

    this.whileMatching('BANG_EQUAL', 'EQUAL_EQUAL', op => {
      const right = this.comparison()
      expr = Expr.Binary({ left: expr, op, right })
    })

    return expr
  }

  private comparison(): Expression {
    let expr = this.term()

    this.whileMatching('GREATER', 'GREATER_EQUAL', 'LESS', 'LESS_EQUAL', op => {
      const right = this.term()
      expr = Expr.Binary({ left: expr, op, right })
    })

    return expr
  }

  private term(): Expression {
    let expr = this.factor()

    this.whileMatching('MINUS', 'PLUS', op => {
      const right = this.factor()
      expr = Expr.Binary({ left: expr, op, right })
    })

    return expr
  }

  private factor(): Expression {
    let expr = this.unary()

    this.whileMatching('SLASH', 'STAR', op => {
      const right = this.unary()
      expr = Expr.Binary({ left: expr, op, right })
    })

    return expr;
  }

  private unary(): Expression {
    const op = this.match('BANG', 'MINUS')
    if (op) {
      const expr = this.unary()
      return Expr.Unary({ op, expr })
    }

    return this.primary()
  }

  private primary(): Expression {
    if (this.match('FALSE')) return Expr.Literal({ value: false })
    if (this.match('TRUE')) return Expr.Literal({ value: true })
    if (this.match('NIL')) return Expr.Literal({ value: null })

    {
      const lit = this.match('NUMBER', 'STRING')
      if (lit) return Expr.Literal({ value: lit.literal })
    }

    if (this.match('IDENTIFIER')) {
      return
    }

    if (this.match('LEFT_PAREN')) {
      const expr = this.expression();
      this.consume('RIGHT_PAREN', "Expected ')' after expression.")
      return Expr.Grouping({ expr })
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
