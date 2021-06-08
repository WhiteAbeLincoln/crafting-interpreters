import Token from '../scanner/token'
import { SingletonHandler } from '../util'

export type ErrorKind = 'source' | 'runtime'

export interface LoxError {
  readonly kind: ErrorKind
  toString(): string
}

export class SourceError implements LoxError {
  readonly kind: ErrorKind = 'source'
  private message: string
  constructor(line: number,
              where: string,
              message: string) {
                this.message = `[line ${line}] Error${where}: ${message}`
              }
  toString(): string {
    return this.message
  }
}

export class RuntimeError implements LoxError {
  readonly kind: ErrorKind = 'runtime'
  private message: string
  constructor(token: Token, message: string) {
    this.message = `${message}\n[line ${token.line}]`
  }
  toString(): string {
    return this.message
  }
}

export interface ErrorHandler {
  hadError(): boolean
  hadRuntimeError(): boolean
  reset(): void
  add(err: LoxError): void
}

const handler = SingletonHandler.Create<ErrorHandler>('ErrorHandler')

export function report(line: number, where: string, message: string) {
  handler.add(new SourceError(line, where, message))
}

export function error(line: number, message: string) {
  report(line, "", message)
}

export function runtimeError(error: RuntimeError) {
  handler.add(error)
}

export default handler
