```txt
npm install
npm run dev
```

```txt
npm run deploy
```

```sh
ngrok http 8787 --url=willing-grub-included.ngrok-free.app
```

[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```txt
npm run cf-typegen
```

Pass the `CloudflareBindings` as generics when instantiation `Hono`:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```

