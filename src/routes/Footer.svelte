<style>
  .b-divider {
    height: 3rem;
    background-color: rgba(0, 0, 0, .1);
    border: solid rgba(0, 0, 0, .15);
    border-width: 1px 0;
    box-shadow: inset 0 .5em 1.5em rgba(0, 0, 0, .1), inset 0 .125em .5em rgba(0, 0, 0, .15);
  }
</style>

<div class="b-divider"></div>

<h1 class="visually-hidden">FAQ</h1>

<div id="block1" class="px-4 py-5 my-5 text-center">
  <h1 class="display-5 fw-bold">FAQ</h1>
  <br/>
  <div class="col-lg-6 mx-auto">
    <h4>Why do relays have my data?</h4>
    <p class="lead mb-4"><a href="https://github.com/nostr-protocol/nips/blob/master/01.md" target="_blank">Nostr</a> is a relay based network, where your messages are broadcast to multiple servers. This design helps make it censorship resistant and distributed.</p>
    <h4>How does deletion work?</h4>
    <p class="lead mb-4">Nostr supports a deletion event kind to request event removal. <a href="https://github.com/nostr-protocol/nips/blob/master/09.md" target="_blank">Find out more</a>. Deletion requests are best effort, however most relays will stop broadcasting events flagged as deleted.</p>
    <h4>Can I undo deletion?</h4>
    <p class="lead mb-4">In a way.. just create a new event with the same input as the deleted event. It will have a new unique identifier, however it not be marked as deleted and function like a normal event.</p>
  </div>
</div>

<div class="b-divider mb-0"></div>
