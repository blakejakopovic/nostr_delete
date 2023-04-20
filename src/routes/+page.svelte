<style>
  .eventPreviewBody {
    max-height: 320px;
  }
</style>

<script>
  import { RelayStore, SessionStore } from '../stores'
  import RelayList from '$lib/RelayList/RelayList.svelte';
  import Footer from './Footer.svelte';
  import { fade } from 'svelte/transition'
  import { fetchAuthorEventKind, eventBechToHex, toHexString, createNostrDeleteEvent, publishEvent} from '$lib/nostr'
  import { onMount } from 'svelte'

  let showAddRelayForm = true
  let accordionShow = ''

  let alert_message = ''; // Not used

  let noteInputValue = '';

  let resetFormBtnEnabled = false
  let publishBtnEnabled = false ; // TODO: need to handle case with no selected relays

  let event_preview = null;
  let event_preview_loading = false;

  let pasteBtnClass = 'btn btn-outline-primary';
  let pasteBtnIconClass = 'bi bi-clipboard';

  let noteInputValid = false
  let noteInputClass = 'form-control'

  let previewTimeout = null;

  let nostrExtensionLoaded = false


  onMount(async () => {
    $: nostrExtensionLoaded = window.nostr
  })

  function updateAllRelayItemWithState(s) {
    RelayStore.update((current) => {
      var newRelays = current.map(r => ({ ...r, state: s }))
      console.log(newRelays)
      return newRelays
    });
  }

  function updateRelayItemWithState(relay_url, s) {
    RelayStore.update((current) => {
      current.forEach(relay => {
        if (relay.relay_url === relay_url) {
          relay.state = s;
        }
      })

      return current;
    })
  }

  $: selectedRelays = Object.entries($RelayStore).filter(([k, v]) => v.checked == true )

  async function pasteNote() {
    const clipboard_text = await navigator.clipboard.readText()

    try {
      bech32.decode(clipboard_text)
      noteInputValue = clipboard_text
      pasteBtnIconClass = 'bi bi-clipboard-check';
      pasteBtnClass = 'btn btn-success';
      loadEventPreview()

      // set icon -checked with timeout to reset
    } catch (e) {
      console.log('invalid note: '+ e)
      pasteBtnIconClass = 'bi bi-clipboard-x';
      pasteBtnClass = 'btn btn-danger';
    }

    setTimeout(function(){
      pasteBtnIconClass = 'bi bi-clipboard';
      pasteBtnClass = 'btn btn-outline-primary';
    }, 700);
  }

  function loadEventPreview() {

    event_preview = null

    console.log(noteInputValue);
    try {
      var event_id_hex = eventBechToHex(noteInputValue);
      noteInputClass = 'form-control is-valid'
      noteInputValid = true
      publishBtnEnabled = true
    } catch (e) {
      console.log('invalid note: '+ e)
      noteInputClass = 'form-control is-invalid'
      noteInputValid = true
      publishBtnEnabled = false
      return;
    }

    SessionStore.update((current) => {
      current.target_deletion_event_id = event_id_hex
      return current
    });

    // TODO: Load event from all selected relays below (first one wins)
    fetchEvent('wss://nos.lol', event_id_hex);
  }

  function fetchEvent(websocket_url, event_id) {
    console.log("fetching event from: " + websocket_url);

    // TODO: Maybe make random/uuid for sub id
    let nostr_request = '["REQ","101",{"ids":["'+event_id+'"]}]';
    console.log(nostr_request);

    var ws = new WebSocket(websocket_url);

    // Add fetch timeout
    previewTimeout = setTimeout(function(){
      event_preview = "Event preview timeout - but it may still exist somewhere."

      ws.close();
    }, 5000);

    ws.onopen = function(event) {
      ws.send(nostr_request);
    }

    // TODO: Add onError handling for load preview

    ws.onmessage = function(event) {
      console.log('WS Message: '+websocket_url+' - '+event.data);

      // TODO: Add try catch?
      let response = JSON.parse(event.data);

      // We need to handle wss://nostr.mutinywallet.com as a special case as they return false on success
      if (response.length == 3 && response[0] == "EVENT") {

        clearTimeout(previewTimeout);

        // TODO: More validation
        let event = response[2];
        console.log(event);

        SessionStore.update((current) => {
          current.target_deletion_event = event
          return current
        });

        event_preview = JSON.stringify(event)

        try { ws.close(); } catch {} // Some WS disconnect immediately
      } else if (response[0] == "EOSE" && event_preview == null) {
        event_preview = "Event not found - but it may still exist somewhere."
        clearTimeout(previewTimeout);
        try { ws.close(); } catch {} // Some WS disconnect immediately
      } else {
        clearTimeout(previewTimeout);
        try { ws.close(); } catch {} // Some WS disconnect immediately
      }
    }
  }

  async function loadExtensionPubkey() {
    if (!$SessionStore.extension_pubkey) {

      var extension_pubkey = await window.nostr.getPublicKey()
      if (!extension_pubkey) { return null }

      SessionStore.update((current) => {
        current.extension_pubkey = extension_pubkey
        return current
      });

    } else {
      extension_pubkey = $SessionStore.extension_pubkey
    };

    console.log($SessionStore.extension_pubkey)

    return extension_pubkey
  }

  async function signAndPublishBtn() {

    if ($SessionStore.extension_pubkey &&
        $SessionStore.target_deletion_event &&
        $SessionStore.target_deletion_event.pubkey != $SessionStore.extension_pubkey) {
      console.log("Error: Extension pubkey doesn't match event")
      return
    }

    accordionShow = 'show'
    publishBtnEnabled = false
    showAddRelayForm = false

    var extension_pubkey = await loadExtensionPubkey() || (() => { throw new Error('Unable to load Extension Pubkey'); })();

    try {
      // Generate deletion event and ask to sign
      var signed_deletion_event = await createNostrDeleteEvent(extension_pubkey, [$SessionStore.target_deletion_event_id]);
      console.log(signed_deletion_event);

      SessionStore.update((current) => {
        current.signed_deletion_event = signed_deletion_event
        return current
      });

    } catch (error) {
      console.error(error);
      return // early
    }

    // Set state of unselected relays
    var unselected = Object.entries($RelayStore).filter(([k, v]) => v.checked == false )
    unselected.map(([k,v]) => {
      updateRelayItemWithState(v.relay_url, 'ignored')
    })

    selectedRelays.map(([k,v]) => {
      updateRelayItemWithState(v.relay_url, 'loading')

      publishEvent(v.relay_url, signed_deletion_event, (response) => {
        if (response) {
          updateRelayItemWithState(v.relay_url, response)
        } else {
          updateRelayItemWithState(v.relay_url, 'error')
        }
      })

    })

    resetFormBtnEnabled = true
  }

  async function retryFailedPublish() {
    // Set state of unselected relays
    var retryRelays = Object.entries($RelayStore).filter(([k, v]) => ['error', 'timeout'].includes(v.state) )

    retryRelays.map(([k,v]) => {
      updateRelayItemWithState(v.relay_url, 'loading')

      publishEvent(v.relay_url, $SessionStore.signed_deletion_event, (response) => {
        if (response) {
          updateRelayItemWithState(v.relay_url, response)
        } else {
          updateRelayItemWithState(v.relay_url, 'error')
        }
      })

    })
  }

</script>


<main>

  {#if alert_message}
    <div transition:fade id="error-message" class="alert alert-warning alert-dismissible" role="alert">
      { alert_message }
      <button type="button" class="btn-close" on:click={() => alert_message = null}></button>
    </div>
  {/if}

  <h1 class="visually-hidden">Nostr Event Deletion</h1>

  <div id="block1" class="px-4 py-5 my-5 text-center">
    <!-- <img class="d-block mx-auto mb-4" src="https://cdn.nostrgraph.net/public/archive_icon.png" alt="" width="72" height="72"> -->
    <h1 class="display-5 fw-bold">Nostr Event Deletion</h1>
    <br/>
    <div class="col-lg-6 mx-auto">
      <p id="tagline" class="lead mb-4">So.. you want something gone? </p>
      <div class="d-grid gap-2 d-sm-flex justify-content-sm-center">
        <form class="w-100 me-3" on:submit:preventDefault>

          <div id="relayInputGroup" class="input-group mt-1 mb-2">
            <input type="text" class={noteInputClass} placeholder="note1..." bind:value={noteInputValue} on:input={loadEventPreview}>
            <!-- TODO: Add a Paste button here -->
            <button class={pasteBtnClass} type="button" on:click={pasteNote}><i class={pasteBtnIconClass}></i></button>
          </div>

          {#if event_preview !== null}
            <div transition:fade class="card mb-3 text-center">
              <div class="eventPreviewBody card-body text-break word-break overflow-auto">
                {event_preview}
              </div>
            </div>
          {/if}

          <div class="accordion" id="accordionRelays">

            <RelayList bind:showAddRelayForm bind:selectedRelays bind:accordionShow />

          </div>

          {#if !nostrExtensionLoaded }
          <div id="nip07RequiredMessage" class="mt-4">
            <strong>Please activate or install a <a href="https://github.com/nostr-protocol/nips/blob/master/07.md">NIP-07 Nostr Browser Extension</a> to continue</strong>
          </div>

          {:else if !resetFormBtnEnabled}
          <button type="button" on:click={signAndPublishBtn} class="btn btn-danger btn-lg px-4 gap-3 mt-4" disabled={!publishBtnEnabled}>Sign and Publish Deletion</button>

          {:else if resetFormBtnEnabled}
          <div id="resetForm" class="mt-4">
            <a class="btn btn-link" data-sveltekit-reload href="/">Reset Form</a>
            <button class="btn btn-link" on:click={retryFailedPublish}>Retry Failed</button>
          </div>
          {/if}

        </form>
      </div>
    </div>
  </div>

  <Footer />

</main>
