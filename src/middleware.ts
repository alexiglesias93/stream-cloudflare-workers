import type { MiddlewareHandler } from 'hono';
import { CoolerError } from './errors';
import * as jose from 'jose';

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
  const authorization = c.req.header('Authorization');
  const access_token = authorization?.split('Bearer ')[1];
  if (!access_token) {
    throw new CoolerError(401, 'Missing auhentication header');
  }

  // Decode & validate the token
  const url = new URL('https://cfw-stream.us.auth0.com/.well-known/jwks.json');

  const JWKS = jose.createRemoteJWKSet(url);

  const result = await jose.jwtVerify(access_token, JWKS, {
    audience: [
      'https://stream.finsweet.com',
      'https://cfw-stream.us.auth0.com/userinfo',
    ],
    issuer: 'https://cfw-stream.us.auth0.com/',
  });

  console.log(result.key);
  console.log(result.payload);
  console.log(result.protectedHeader);

  // Extract the user_id from the token
  if (!result.payload.sub) {
    throw new CoolerError(401, 'Unable to identify the user.');
  }

  // Inject user info
  c.set('user_id', result.payload.sub);

  await next();
};
