import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { StatusCode } from 'hono/utils/http-status';
import { v4 as uuidv4 } from 'uuid';
import {
  assert,
  boolean,
  object,
  optional,
  string,
  StructError,
} from 'superstruct';

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

class CoolerError extends Error {
  constructor(public status: StatusCode, public message: string) {
    super(message);
    this.name = 'CoolerError';
  }
}

type Context = {
  Bindings: {
    STREAM_TODOS: KVNamespace;
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

app.get('/', (c) => {
  return c.text('Hello Joel!');
});

app.get('/todos', async (c) => {
  const items = await c.env.STREAM_TODOS.list();
  const todos = await Promise.all(
    items.keys.map(({ name }) => c.env.STREAM_TODOS.get(name))
  );

  return c.json(todos);
});

// https://example.com/todos/1234
app.get('/todos/:user_id', async (c) => {
  const user_id = c.req.param('user_id');

  const items = await c.env.STREAM_TODOS.list({ prefix: `${user_id}_` });
  const todos = await Promise.all(
    items.keys.map(({ name }) => c.env.STREAM_TODOS.get(name))
  );

  return c.json(todos);
});

app.post('/todos/:user_id', async (c) => {
  const user_id = c.req.param('user_id');
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

app.get('/error', (c) => {
  const data = {
    title: 'hey',
    completed: 'false',
  };

  assert(data, todosSchema);

  return c.json(data);
});

export default app;
