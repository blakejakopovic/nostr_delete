<script>
  import { RelayStore } from '../../stores'
  import { fade } from 'svelte/transition'

  const toggleChecked = function() {
    // Prevent toggling if we have started processing
    if (state != null) { return }

    RelayStore.update((current) => {
      current.forEach(relay => {
        if (relay.relay_url === relay_url) {
          relay.checked = !checked;
        }
      })

      return current;
    })
  }

  // e.currentTarget.value

   export let relay_url;
   export let checked;
   export let state;
</script>

<label transition:fade class="list-group-item d-flex justify-content-between align-items-center">

  <span>
    {#if state == null}
      <input class="form-check-input me-1" type="checkbox" value="{ relay_url }" bind:checked  on:click={toggleChecked}>
    {/if}
    { relay_url }
  </span>

  {#if state == "loading"}
    <div class="spinner-border spinner-border-sm" role="status">
      <span class="visually-hidden">Loading...</span>
    </div>
  {:else if state == "timeout"}
    <div class="badge bg-warning" role="status">Timeout</div>
  {:else if state == "error"}
    <div class="badge bg-danger" role="status">Error</div>
  {:else if state == "ignored"}
    <div class="badge bg-secondary" role="status">Ignored</div>
  {:else if state == "success"}
    <div class="badge bg-success" role="status">Success</div>
  {/if}

</label>
