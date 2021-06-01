import Logger from '../logger'
import { ErrorHandler, SourceError } from './errors'

export class LoggerErrorHandler implements ErrorHandler {
  private _hadError = false
  add(err: SourceError) {
    Logger.stderr(err.toString())
    this._hadError = true
  }
  reset() {
    this._hadError = false
  }
  hadError() {
    return this._hadError
  }
}
