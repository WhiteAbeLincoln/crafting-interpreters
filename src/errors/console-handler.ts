import { ErrorHandler, SourceError } from './errors'

export class ConsoleErrorHandler implements ErrorHandler {
  private _hadError = false
  add(err: SourceError) {
    console.error(err.toString())
  }
  reset() {
    this._hadError = false
  }
  hadError() {
    return this._hadError
  }
}
