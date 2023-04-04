import { writable } from 'svelte/store'

export const SessionStore = writable({
  extension_pubkey: null,
  extension_relays: null,
  kind10002_relay_event: null,
  kind10002_relays: null,
  target_deletion_event_id: null,
  target_deletion_event: null,
  signed_deletion_event: null
});

export const RelayStore = writable([
  {"relay_url": "wss://nostr.mutinywallet.com", "checked": true, "state": null},
  {"relay_url": "wss://relay.damus.io", "checked": true, "state": null},
  {"relay_url": "wss://nos.lol", "checked": true, "state": null},
  {"relay_url": "wss://relay.snort.social", "checked": true, "state": null},
  {"relay_url": "wss://brb.io", "checked": true, "state": null}
]);
