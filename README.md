# Nostr Event Deletion

Nostr Event Deletion micro web-app. Helps you create a Nostr deletion event (kind 5), and broadcast it to  bootstrap relays, while optionally loading your additional relays from your Nostr browser extension and kind 10_002 event - to maximise the effectiveness. You can also add addtional relays manually.

## Screenshots

![Initial screen](/demo/1.jpg)

![While processing](/demo/2.jpg)

## Usage

You can also access the hosted version online at [Event Deletion](https://nostr-delete.vercel.app). It's 100% client side, so it's all client side javascript without server processing.


To run locally (or develop), you can follow the steps below.

```bash
git clone https://github.com/blakejakopovic/nostr_delete
cd nostr_delete
npm install

# For generating static website files (as everything is client side anyway)
npm run build

# Run locally (a server is needed as browser extensions, at least in safari, wont activate using file:/// URLs)
npm run preview

# ----

# Or, For running using instead using server side rendering

# 1. Comment out (or delete) the code config in /src/routes/+layout.js
# 2. Uncomment "import adapter from '@sveltejs/adapter-auto';" in svelte.config.js
# 3. Comment   "import adapter from '@sveltejs/adapter-static';"  in svelte.config.js

# start the server
npm run dev

# or to start the server and load in a browser
npm run dev -- --open

```
