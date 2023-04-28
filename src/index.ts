import { Hono } from 'hono';
import { v4 as uuidv4 } from 'uuid';

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

type Context = {
  Bindings: {
    STREAM_TODOS: KVNamespace;
  };
};

const app = new Hono<Context>();

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
  const data = await c.req.formData();

  const title = data.get('title');
  if (!title) {
    throw new Error('Missing title');
  }

  console.log(data.get('completed'));

  const completed = data.get('completed') === 'on';
  const id = uuidv4();

  const todo = {
    id,
    title,
    completed,
  };

  console.log(todo);

  await c.env.STREAM_TODOS.put(`${user_id}_${id}`, JSON.stringify(todo));

  return c.json(todo);
});

export default app;
