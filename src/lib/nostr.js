import { bech32 } from "@scure/base";

export function nostrExtensionLoaded() {
  if (!window.nostr) {
    return false;
  }
  return true;
}

export function eventBechToHex(bech32_encoded) {
  var bech32_decoded = bech32.decode(bech32_encoded, 1000);
  const data = new Uint8Array(bech32.fromWords(bech32_decoded.words));
  const id = bech32_decoded.prefix === "note" ? data : decodeTlv(data)[0][0];
  return toHexString(id);
}

export function toHexString(buffer) {
  return buffer.reduce((s, byte) => {
    let hex = byte.toString(16);
    if (hex.length === 1) hex = '0' + hex;
    return s + hex;
  }, '');
}

export function fetchAuthorEventKind(websocket_url, pubkey, kind, limit = 1, callback) {
  // TODO: Maybe make random/uuid for sub id
  let nostr_request = '["REQ","REQ",{"authors":["'+pubkey+'"], "kinds": ['+kind+'], "limit": '+limit+'}]';

  var ws = new WebSocket(websocket_url);

  var timeout = setTimeout(() => {
    ws.close();
    callback(null);
  }, 5000);

  ws.onopen = function(event) {
    ws.send(nostr_request);
  }

  ws.onmessage = function(msg) {
    console.log('WS Message: '+websocket_url+' - '+msg.data);

    try {
      var response = JSON.parse(msg.data)

      if (response[0] != "EVENT") { console.log('response[0] != "EVENT"'); return }
      if (!response[2]) { console.log('!response[2]'); return }

      event = response[2]

      clearTimeout(timeout);
      callback(event);
      ws.close();
    } catch (e) {
      // NOTICE / EOSE / BAD JSON
      console.log(e)
      clearTimeout(timeout);
      callback(null);
      ws.close();
    }
  }

  ws.onerror = function(error) {
    console.log(error)
    ws.close();
    callback(null);
  }

  ws.onclose = function(close) {
    clearTimeout(timeout);
    ws.close();
    callback(null);
  }
}

export function publishEvent(websocket_url, event, callback) {
  // console.log("fetching event from: " + websocket_url);

  // TODO: Maybe make random/uuid for sub id
  let nostr_cmd = ["EVENT", event]
  // console.log(nostr_request);

  let success = false;

  var ws = new WebSocket(websocket_url);

  var timeout = setTimeout(() => {
    callback('timeout');
  }, 10000);

  ws.onopen = function(event) {
    ws.send(JSON.stringify(nostr_cmd));
  }

  ws.onmessage = function(msg) {
    console.log('WS Message: '+websocket_url+' - '+msg.data);

    try {
      var response = JSON.parse(msg.data)

      if (response[0] != "OK") { console.log('response[0] != "OK" - ' + response[0]); return }

      clearTimeout(timeout);
      success = true;
      callback('success');

    } catch (e) {
      // NOTICE / EOSE / BAD JSON
      console.log(e)
      clearTimeout(timeout);
      if (!success) { callback('error') }
    }
  }

  ws.onerror = function(error) {
    console.log(error)
    if (!success) { callback('error') }
  }

  ws.onclose = function(close) {
    clearTimeout(timeout);
  }
}

//

function sha256Hex(string) {
  const utf8 = new TextEncoder().encode(string);

  return crypto.subtle.digest('SHA-256', utf8).then((hashBuffer) => {
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray
        .map((bytes) => bytes.toString(16).padStart(2, '0'))
        .join('');

      return hashHex;
  });
}

async function generateNostrEventId(msg) {
  const digest = [
      0,
      msg.pubkey,
      msg.created_at,
      msg.kind,
      msg.tags,
      msg.content,
  ];
  const digest_str = JSON.stringify(digest);
  const hash = await sha256Hex(digest_str);

  return hash;
}

export async function createNostrDeleteEvent(pubkey, event_ids) {
  try {

    // if (!nostrExtensionLoaded()) {
    //   throw "Nostr extension not loaded or available"
    // }

    let msg = {
        kind: 5, // NIP-X - Deletion
        content: "", // Deletion Reason
        tags: []
    };

    for (let event_id of event_ids) {
      msg.tags.push(["e", event_id])
    }

    // set msg fields
    msg.created_at = Math.floor((new Date()).getTime() / 1000)
    msg.pubkey = pubkey

    // Generate event id
    msg.id = await generateNostrEventId(msg)

    // Sign event
    var signed_msg = await window.nostr.signEvent(msg)

  } catch (e) {
    console.log("Failed to sign message with browser extension", e)
    return false;
  }

  return signed_msg;
}

function decodeTlv(buffer, acc = {}) {
  const t = buffer[0];
  const l = buffer[1];
  const v = buffer.slice(2, 2 + l);
  const values = acc[t] ?? [];
  const result = { ...acc, [t]: [...values, v] };
  const rest = buffer.slice(2 + l);
  return rest.length > 0 ? decodeTlv(rest, result) : result;
}
