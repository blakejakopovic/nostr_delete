# Nostr Event Deletion

Nostr Event Deletion micro web-app. Helps you create a Nostr deletion event (kind 5), and broadcast it to  bootstrap relays, while optionally loading your additional relays from your Nostr browser extension and kind 10_002 event - to maximise the effectiveness. You can also add addtional relays manually.

## Screenshots

![Initial screen](/static/1.jpg)

![While processing](/static/2.jpg)

## Usage

To run locally, you can follow the steps below.

```bash
git clone https://github.com/blakejakopovic/nostr_delete
cd nostr_delete
npm install

# start the server
npm run dev

# or to start the server and load in a browser
npm run dev -- --open

```

## Using Standalone

This tool was first built using plain Javascript. I ported the initial prototype while learning Svelte, however a side effect is that it's no longer a single standalone html file. If you would like to use a version with slightly less features (basically without loading relays from your extension or kind 10_002 events), you can instead use the included [Nostr Event Deletion](static/standalone.html) standalone html file.

You can also access the standalone version online at [NostrGraph - Event Deletion](http://cdn.nostrgraph.net/public/delete.html)
