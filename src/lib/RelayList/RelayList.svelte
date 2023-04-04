<script> // lang=ts
  import { RelayStore, SessionStore } from '../../stores'
  import RelayItem from './RelayItem.svelte';

  import { fetchAuthorEventKind } from '$lib/nostr'
  import { fade } from 'svelte/transition'

  export let showAddRelayForm = true
  export let selectedRelays = []
  export let accordionShow = ''

  // TODO: Show disable the sign and publish button when loading relays
  // TODO: Ideally show a deletion event note1 id (for proof.validation of work)

  let loadMyRelaysBtnDisabled = false
  let loadExtRelaysBtnDisabled = false

  let add_relay_input = null
  let add_relay_input_value = ''
  const valid_relay_url_regex = new RegExp('^wss?://')
  let valid_add_relay_input = null

  let pasteBtnClass = 'btn btn-outline-secondary'
  let pasteBtnIconClass = 'bi bi-clipboard'

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

    return extension_pubkey
  }

  async function loadExtensionRelays() {
    if (!$SessionStore.extension_relays) {

      var extension_relays = await window.nostr.getRelays()
      if (!extension_relays) { return null }

      SessionStore.update((current) => {
        current.extension_relays = extension_relays
        return current
      });

    } else {
      extension_relays = $SessionStore.extension_relays
    };

    return extension_relays
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

  async function loadMyRelays() {
    loadMyRelaysBtnDisabled = true
    var extension_pubkey = await loadExtensionPubkey() || (() => { throw new Error('Unable to load Extension Pubkey'); })();

    let processing = selectedRelays.length
    let events = []

    selectedRelays.map(([k,v]) => {
      updateRelayItemWithState(v.relay_url, 'loading')
      fetchAuthorEventKind(v.relay_url, extension_pubkey, 10002, 1, (response) => {
        if (response) { events.push(response) }
        updateRelayItemWithState(v.relay_url, null)
        processing -= 1
      })
    })

    const waitForResults = () => {
      // Check some condition here
      if (processing > 0) {
        setTimeout(waitForResults, 20)
        return
      }

      // TODO: Validate event signatures

      if (events.length == 0) { loadMyRelaysBtnDisabled = false; return }
      let latest_event = events.sort((a, b) => b.created_at - a.created_at)[0];

      console.log('latest_event')
      console.log(latest_event)

      if (latest_event) {

        let relays = latest_event.tags.filter((t) => t[0] == 'r').map((r, idx) => r[1])

        SessionStore.update((current) => {
          current.kind10002_relay_event = latest_event
          current.kind10002_relays = relays
          return current
        })

        addRelaysToStore(relays)
        loadMyRelaysBtnDisabled = false
      }
    }

    setTimeout(waitForResults, 50);
  }

  function addRelaysToStore(relays) {
    var valid_relays = relays.filter( (r) => valid_relay_url_regex.test(r) )

    console.log(valid_relays)

    valid_relays.map((relay_url) => {
      // TODO: Check if relay is already in the list and skip
      if ($RelayStore.some(r => r.relay_url.replace(/\/$/, '') === relay_url.replace(/\/$/, ''))) { return }

      var new_relay = {"relay_url": relay_url.replace(/\/$/, ''), "checked": true, "state": null};
      RelayStore.update((current) => {
        return [...current, new_relay]
      });
    });
  }

  function addRelayFromInput() {
      if (valid_add_relay_input !== true) { return; }

      addRelaysToStore([add_relay_input_value])

      add_relay_input_value = '';
      valid_add_relay_input = null; // ideally this is done automatically?
  }

  function validateRelayInput() {
    if (add_relay_input_value === '') { valid_add_relay_input = null; return; }
    if (!valid_relay_url_regex.test(add_relay_input_value)) { valid_add_relay_input = false; return }

    try {
      var url = new URL(add_relay_input_value);
      if (!['ws:', 'wss:'].includes(url.protocol)) { valid_add_relay_input = false; return}
      valid_add_relay_input = true;
    } catch (error) {
      valid_add_relay_input = false;
    }
  }

  async function addExtensionRelays() {
    loadExtRelaysBtnDisabled = true

    var extension_relays = await loadExtensionRelays() || (() => { throw new Error('Unable to load Extension Relays'); })();

    var write_relays = Object.entries(extension_relays).filter(([k, v]) => v == null || v.write == true ).map(([k,v]) => k);

    addRelaysToStore(write_relays)

    loadExtRelaysBtnDisabled = false
  }

  // New relay input dynamic class
  $: {
    if (add_relay_input) {
      if (valid_add_relay_input == null) {
        add_relay_input.classList.remove('is-valid')
        add_relay_input.classList.remove('is-invalid')
      } else if (valid_add_relay_input == true ) {
        add_relay_input.classList.add('is-valid')
        add_relay_input.classList.remove('is-invalid')
      } else if (valid_add_relay_input == false){
        add_relay_input.classList.remove('is-valid')
        add_relay_input.classList.add('is-invalid')
      }
    }
  }

  async function pasteRelay() {
    const clipboard_text = await navigator.clipboard.readText()
    add_relay_input_value = clipboard_text
    validateRelayInput()
  }

</script>

<div class="accordion-item">
  <h2 class="accordion-header">
    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#advancedRelays">
      Advanced: Nostr Relay Selection
    </button>
  </h2>
  <div id="advancedRelays" class="accordion-collapse collapse {accordionShow}">
    <div class="accordion-body">

    <div class="list-group text-start">

      {#each $RelayStore as relay (relay.relay_url)}
        <RelayItem {...relay}/>
      {/each}

    </div>

    {#if showAddRelayForm}
    <div transition:fade="{{duration: 200 }}">
      <div class="input-group mt-1">
        <input type="text" class="form-control" placeholder="wss://" bind:value={add_relay_input_value} bind:this={add_relay_input} on:input={validateRelayInput}>
        <button class={pasteBtnClass} type="button" on:click={pasteRelay}><i class={pasteBtnIconClass}></i></button>
        <button class="btn btn-outline-primary" type="button" on:click={addRelayFromInput} disabled={valid_add_relay_input != true }>Add Relay</button>
      </div>

      <div class="mt-3">
        <button class="btn btn-outline-primary" type="button" on:click={addExtensionRelays} disabled={loadExtRelaysBtnDisabled}>Load Extension Relays</button>
        <button class="btn btn-outline-primary" type="button" on:click={loadMyRelays} disabled={loadMyRelaysBtnDisabled}>Load My Kind 10002 Relays</button>
      </div>
    </div>
    {/if}

    </div>
  </div>
</div>
