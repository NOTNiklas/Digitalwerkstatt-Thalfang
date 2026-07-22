/* IT Heimdesk – einfache Ticketverwaltung (localStorage) */
(function () {
  "use strict";

  const STORAGE_KEY = "heimdesk.tickets.v1";
  const STATUSES = ["Offen", "In Arbeit", "Erledigt"];

  const form = document.getElementById("ticketForm");
  const list = document.getElementById("ticketList");
  const template = document.getElementById("ticketTemplate");
  const emptyState = document.getElementById("emptyState");
  const filterStatus = document.getElementById("filterStatus");
  const clearDoneBtn = document.getElementById("clearDone");
  const toast = document.getElementById("toast");

  let tickets = load();

  /* ---------- Persistenz ---------- */
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const data = raw ? JSON.parse(raw) : [];
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.warn("Tickets konnten nicht geladen werden:", err);
      return [];
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
    } catch (err) {
      console.warn("Tickets konnten nicht gespeichert werden:", err);
    }
  }

  function makeId() {
    return "t_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  /* ---------- Ticket-Operationen ---------- */
  function addTicket(data) {
    tickets.unshift({
      id: makeId(),
      title: data.title,
      requester: data.requester,
      category: data.category,
      priority: data.priority,
      description: data.description,
      status: "Offen",
      createdAt: Date.now()
    });
    save();
    render();
  }

  function updateStatus(id, status) {
    const ticket = tickets.find((t) => t.id === id);
    if (!ticket || !STATUSES.includes(status)) return;
    ticket.status = status;
    save();
    render();
  }

  function deleteTicket(id) {
    const index = tickets.findIndex((t) => t.id === id);
    if (index === -1) return;
    const [removed] = tickets.splice(index, 1);
    save();
    render();
    showToast(`Ticket „${removed.title}“ gelöscht.`, () => {
      // Wiederherstellen an ursprünglicher Position
      tickets.splice(Math.min(index, tickets.length), 0, removed);
      save();
      render();
    });
  }

  function clearDone() {
    const doneCount = tickets.filter((t) => t.status === "Erledigt").length;
    if (doneCount === 0) {
      showToast("Es gibt keine erledigten Tickets.");
      return;
    }
    if (!window.confirm(`${doneCount} erledigte(s) Ticket(s) endgültig löschen?`)) return;
    tickets = tickets.filter((t) => t.status !== "Erledigt");
    save();
    render();
    showToast(`${doneCount} erledigte(s) Ticket(s) gelöscht.`);
  }

  /* ---------- Darstellung ---------- */
  function formatDate(ts) {
    try {
      return new Date(ts).toLocaleString("de-DE", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit"
      });
    } catch (err) {
      return "";
    }
  }

  function renderStats() {
    const count = (s) => tickets.filter((t) => t.status === s).length;
    document.getElementById("statOpen").textContent = count("Offen");
    document.getElementById("statProgress").textContent = count("In Arbeit");
    document.getElementById("statDone").textContent = count("Erledigt");
  }

  function render() {
    renderStats();
    const filter = filterStatus.value;
    const visible = tickets.filter((t) => filter === "all" || t.status === filter);

    list.innerHTML = "";

    if (tickets.length === 0) {
      emptyState.hidden = false;
      emptyState.textContent = "Noch keine Tickets vorhanden. Lege links das erste an.";
      return;
    }
    if (visible.length === 0) {
      emptyState.hidden = false;
      emptyState.textContent = "Keine Tickets mit diesem Status.";
      return;
    }
    emptyState.hidden = true;

    const frag = document.createDocumentFragment();
    visible.forEach((ticket) => frag.appendChild(buildTicket(ticket)));
    list.appendChild(frag);
  }

  function buildTicket(ticket) {
    const node = template.content.firstElementChild.cloneNode(true);
    node.dataset.id = ticket.id;
    node.dataset.status = ticket.status;

    const prio = node.querySelector(".badge--prio");
    prio.textContent = ticket.priority;
    prio.dataset.prio = ticket.priority;

    node.querySelector(".badge--status").textContent = ticket.status;
    node.querySelector(".ticket__cat").textContent = ticket.category;
    node.querySelector(".ticket__title").textContent = ticket.title;

    const desc = node.querySelector(".ticket__desc");
    if (ticket.description) {
      desc.textContent = ticket.description;
    } else {
      desc.remove();
    }

    node.querySelector(".ticket__requester").textContent = "Melder:in: " + ticket.requester;
    node.querySelector(".ticket__date").textContent = formatDate(ticket.createdAt);

    const statusSelect = node.querySelector(".ticket__status");
    statusSelect.value = ticket.status;
    statusSelect.addEventListener("change", () => updateStatus(ticket.id, statusSelect.value));

    node.querySelector(".ticket__delete").addEventListener("click", () => {
      if (window.confirm(`Ticket „${ticket.title}“ wirklich löschen?`)) {
        deleteTicket(ticket.id);
      }
    });

    return node;
  }

  /* ---------- Toast mit optionalem Undo ---------- */
  let toastTimer = null;
  function showToast(message, undoFn) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    if (typeof undoFn === "function") {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "toast__undo";
      btn.textContent = "Rückgängig";
      btn.addEventListener("click", () => {
        undoFn();
        hideToast();
      });
      toast.appendChild(btn);
    }
    toast.hidden = false;
    // Reflow, damit die Transition greift
    void toast.offsetWidth;
    toast.classList.add("toast--show");
    toastTimer = setTimeout(hideToast, 5000);
  }

  function hideToast() {
    toast.classList.remove("toast--show");
    setTimeout(() => { toast.hidden = true; toast.textContent = ""; }, 200);
  }

  /* ---------- Events ---------- */
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = {
      title: form.title.value.trim(),
      requester: form.requester.value.trim(),
      category: form.category.value,
      priority: form.priority.value,
      description: form.description.value.trim()
    };
    if (!data.title || !data.requester) {
      showToast("Bitte Titel und Melder:in ausfüllen.");
      return;
    }
    addTicket(data);
    form.reset();
    form.priority.value = "Mittel";
    form.title.focus();
    showToast("Ticket angelegt.");
  });

  filterStatus.addEventListener("change", render);
  clearDoneBtn.addEventListener("click", clearDone);

  render();
})();
