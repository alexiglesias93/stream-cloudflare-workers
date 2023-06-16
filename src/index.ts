import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Stripe } from 'stripe';

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
import { getAuth0ManagementToken, updateUserRoles } from './utils';

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

const createSubscriptionSchema = object({
  price_id: string(),
});

type Context = {
  Bindings: {
    STREAM_TODOS: KVNamespace;
  };
  Variables: {
    secret: string;
    user_id: string;
    user_permissions: string;
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
  const user_permissions = c.get('user_permissions');

  if (!user_permissions.includes('read:todos')) {
    throw new CoolerError(403, 'Not enough permissions to read the TODOs');
  }

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

app.post('/create-subscription', async (c) => {
  // Extract the product data
  const input = await c.req.json();

  assert(input, createSubscriptionSchema);

  const { price_id } = input;

  const stripe = new Stripe('sk_test_gJeb7B0itOKrR7uzmAsRRdKf00HGHPh9RX', {
    apiVersion: '2022-11-15',
    maxNetworkRetries: 3,
  });

  try {
    const subscription = await stripe.subscriptions.create({
      customer: 'cus_O3BgCib960k9as',
      items: [
        {
          price: price_id,
        },
      ],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });

    if (
      !subscription.latest_invoice ||
      typeof subscription.latest_invoice === 'string' ||
      typeof subscription.latest_invoice.payment_intent === 'string' ||
      !subscription.latest_invoice.payment_intent?.client_secret
    ) {
      throw new Error();
    }

    return c.json({
      subscription_id: subscription.id,
      client_secret: subscription.latest_invoice.payment_intent.client_secret,
    });
  } catch (err) {
    throw new CoolerError(500, 'Subscription creation failed');
  }

  // Create the payment intent with Stripe
  // Return the client secret

  return c.text('idufh');
});

app.post('/webhook', async (c) => {
  const stripe = new Stripe('sk_test_gJeb7B0itOKrR7uzmAsRRdKf00HGHPh9RX', {
    apiVersion: '2022-11-15',
  });

  const signature = c.req.headers.get('Stripe-Signature');
  if (!signature) {
    throw new CoolerError(400, 'Missing signature');
  }

  const rawRequest = await c.req.text();

  const event = await stripe.webhooks.constructEventAsync(
    rawRequest,
    signature,
    'whsec_JuwardNeFWsUqeuLWTIbHYDukV7E4Gkk'
  );

  // Call the management API to update the user profile
  const managementAccessToken = await getAuth0ManagementToken();
  if (!managementAccessToken) {
    throw new CoolerError(500, 'Something went wrong');
  }

  // Update the user's roles
  // Check for the status of the subscription (active, cancelled, etc)
  // Update the user roles
  await updateUserRoles(managementAccessToken);

  return c.body(null, 200);
});

app.get('/roles-test', async (c) => {
  const managementAccessToken = await getAuth0ManagementToken();
  if (!managementAccessToken) {
    throw new CoolerError(500, 'Something went wrong');
  }

  console.log({ managementAccessToken });

  const result = await updateUserRoles(managementAccessToken);
  return c.json(result);
});

export default app;
