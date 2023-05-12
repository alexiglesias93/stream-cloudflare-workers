import { StatusCode } from 'hono/utils/http-status';

export class CoolerError extends Error {
  constructor(public status: StatusCode, public message: string) {
    super(message);
    this.name = 'CoolerError';
  }
}
