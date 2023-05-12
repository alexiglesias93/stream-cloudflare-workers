import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { v4 as uuidv4 } from 'uuid';
import {
  assert,
  boolean,
  object,
  optional,
  string,
  StructError,
} from 'superstruct';
import {
  authenticateUser,
  helloMiddleware,
  superSecretWeapon,
} from './middleware';
import { CoolerError } from './errors';

/**
 * Livestream goals:
 * 1. GET TODOS
 * 2. POST new TODOS
 * 3. Basic TODOS list + form
 * 4. PUT TODOS
 * 5. Edit functionality in UI
 * 6. DELETE TODOS
 * 7. Delete functionality in UI
 */

const todosSchema = object({
  title: string(),
  completed: optional(boolean()),
});

type Context = {
  Bindings: {
    STREAM_TODOS: KVNamespace;
  };
  Variables: {
    secret: string;
    user_id: string;
  };
};

const app = new Hono<Context>();

app.use('*', cors({ origin: '*', maxAge: 3600 * 6, credentials: true }));

app.onError((error, c) => {
  console.log(error.message);

  const status =
    error instanceof CoolerError
      ? error.status
      : error instanceof StructError
      ? 400
      : 500;

  return c.json({ error: error.message, status }, status);
});

app.get('/', helloMiddleware, superSecretWeapon, authenticateUser, (c) => {
  const secret = c.get('secret');

  // Fetch TODOs from the user
  const user_id = c.get('user_id');

  return c.text(secret);
});

app.get('/todos', authenticateUser, async (c) => {
  const user_id = c.get('user_id');

  const items = await c.env.STREAM_TODOS.list({ prefix: `${user_id}_` });
  const todos = await Promise.all(
    items.keys.map(({ name }) => c.env.STREAM_TODOS.get(name))
  );

  return c.json(todos);
});

app.post('/todos', authenticateUser, async (c) => {
  const user_id = c.get('user_id');
  const data = await c.req.json();

  assert(data, todosSchema);

  const id = uuidv4();

  const todo = {
    id,
    title: data.title,
    completed: data.completed,
  };

  console.log(todo);

  await c.env.STREAM_TODOS.put(`${user_id}_${id}`, JSON.stringify(todo));

  return c.json(todo);
});

export default app;
