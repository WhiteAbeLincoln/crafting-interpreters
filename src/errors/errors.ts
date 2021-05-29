import { SingletonHandler } from '../util'

export class SourceError {
  constructor(readonly line: number,
              readonly where: string,
              readonly message: string) {}
  toString(): string {
    return `[line ${this.line}] Error${this.where}: ${this.message}`
  }
}

export interface ErrorHandler {
  hadError(): boolean
  reset(): void
  add(err: SourceError): void
}

const handler = SingletonHandler.Create<ErrorHandler>('ErrorHandler')

export function error(line: number, message: string) {
  handler.add(new SourceError(line, "", message))
}

export default handler
