import type { MiddlewareHandler } from 'hono';
import { CoolerError } from './errors';

export const helloMiddleware: MiddlewareHandler = async (c, next) => {
  console.log('hey!');
  await next();
};

export const superSecretWeapon: MiddlewareHandler = async (c, next) => {
  c.set('secret', '1234');
  await next();
};

export const authenticateUser: MiddlewareHandler = async (c, next) => {
  // Check for Authentication header
  const authentication = c.req.header('Authentication');
  const user_id = authentication?.split('Bearer ')[1];
  if (!user_id) {
    throw new CoolerError(401, 'Missing auhentication header');
  }

  // Inject user info
  c.set('user_id', user_id);

  await next();
};
