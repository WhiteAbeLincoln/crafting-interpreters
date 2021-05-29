import { LoggerHandler } from './logger'

export class ConsoleLoggerHandler implements LoggerHandler {
  constructor(private console: Console = globalThis.console) {}
  stdout(text: string) {
    this.console.log(text)
  }
  stderr(text: string) {
    this.console.error(text)
  }
}
