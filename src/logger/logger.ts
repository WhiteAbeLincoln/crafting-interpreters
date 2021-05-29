import { SingletonHandler } from '../util'

export interface LoggerHandler {
  stdout(text: string): void
  stderr(text: string): void
}

export default SingletonHandler.Create<LoggerHandler>('LoggerHandler')
