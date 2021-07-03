import Logger from '../logger/logger'
import { ErrorHandler, LoxError } from './errors'

export class LoggerErrorHandler implements ErrorHandler {
  private _hadError = false
  private _hadRuntimeError = false
  add(err: LoxError) {
    Logger.stderr(err.toString())
    if (err.kind === 'source') {
      this._hadError = true
    }
    if (err.kind === 'runtime') {
      this._hadRuntimeError = true
    }
  }
  reset() {
    this._hadError = false
    this._hadRuntimeError = false
  }
  hadError() {
    return this._hadError
  }
  hadRuntimeError() {
    return this._hadRuntimeError
  }
}
