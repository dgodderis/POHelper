import { vi } from "vitest";

document.body.innerHTML = `
  <form id="newTaskForm">
    <input id="title" />
    <textarea id="description"></textarea>
    <input id="tags" />
    <input id="due_date" />
  </form>
  <form id="quickTaskForm">
    <input id="quick_title" />
    <input id="quick_tags" />
  </form>
  <div class="row mt-3">
    <div id="todo-cards"></div>
    <div id="inprogress-cards"></div>
    <div id="done-cards"></div>
  </div>
`;

global.bootstrap = {
  Modal: class {
    constructor() {}
    show() {}
    hide() {}
  }
};

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => []
});
