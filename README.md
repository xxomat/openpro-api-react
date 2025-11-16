# OpenPro API React (TypeScript SDK + Playground)

Wrapper SDK for Open Pro — API Multi v1 with a minimal React playground.

- Customer widget surface (read-only)
- Admin surface (full API, including write operations)
- TypeScript-first, role-gated at compile time

Reference: `https://documentation.open-system.fr/api-openpro/tarif/multi/v1/`

## Quick start

1) Install dependencies
```bash
pnpm i   # or: npm i / yarn
```

2) Dev playground
```bash
pnpm dev
```
Open http://localhost:5173 and provide sandbox `baseUrl`, `apiKey`, and ids.

3) Run tests
```bash
pnpm test
```

## Usage (SDK)

Create a customer (read-only) client:
```ts
import { createOpenProClient } from './src/client';

const customer = createOpenProClient('customer', {
  baseUrl: 'https://sandbox.example/api',
  apiKey: 'YOUR_API_KEY'
});

const accommodations = await customer.listAccommodations(47186);
const bookings = await customer.listBookings(47186);
const booking = await customer.getBooking(47186, 123);
```

Create an admin client (full surface):
```ts
import { createOpenProClient } from './src/client';

const admin = createOpenProClient('admin', {
  baseUrl: 'https://sandbox.example/api',
  apiKey: 'YOUR_API_KEY'
});

// read
const accommodations = await admin.listAccommodations(47186);

// write (admin-only)
await admin.updateStock(47186, 1, {
  // payload shape per API spec
});
```

Type safety:
- Admin-only methods are not available on a `customer` client and will fail at compile time if referenced.
- All function names are in English.

## Playground
- Files: `src/playground/*`
- Actions included: list accommodations, list bookings, get booking.
- Warning: do not expose production keys in the browser; use sandbox only.

## Project structure
```
/src/client
  OpenProClient.ts   // role-gated client factory
  types.ts           // shared types
  errors.ts          // error types
  index.ts           // public exports
/src/playground      // minimal React app (Vite)
__tests__            // Vitest unit tests with mocks
```

## Notes
- Some response payloads are kept generic until the Swagger is integrated.
- Consider using a server-side proxy for production to protect the API key.


