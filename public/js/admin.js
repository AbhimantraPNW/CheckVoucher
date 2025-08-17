let ALL_USERS = [];

const rowsEl = document.getElementById("rows");
const filterEl = document.getElementById("filter");

function formatDateTime(isoString) {
  const date = new Date(isoString);
  return (
    date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }) +
    " | " +
    date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    })
  );
}

async function fetchUsers() {
  const res = await fetch("/api/users", { credentials: "include" });
  if (!res.ok) {
    location.href = "/login.html";
    return;
  }
  ALL_USERS = await res.json();
  render(ALL_USERS);
}

function render(list) {
  rowsEl.innerHTML = list
    .map(
      (u) => `
    <tr data-id="${u.id}">
      <td>${u.id}</td>
      <td>${escapeHtml(u.username)}</td>
      <td>
        <span class="total">${u.total_buy ?? 0}</span>
        <button class="inc" aria-label="Tambah 1 untuk ${escapeHtml(u.username)}">+1</button>
      </td>
      <td>${u.created_at ? formatDateTime(u.created_at) : ""}</td>
    </tr>
  `,
    )
    .join("");
}

// filter username (contains, case-insensitive)
filterEl?.addEventListener("input", () => {
  const q = filterEl.value.trim().toLowerCase();
  const filtered = !q
    ? ALL_USERS
    : ALL_USERS.filter((u) => (u.username || "").toLowerCase().includes(q));
  render(filtered);
});

// event delegation untuk tombol +1
rowsEl.addEventListener("click", async (e) => {
  const btn = e.target.closest(".inc");
  if (!btn) return;
  const tr = btn.closest("tr");
  const id = tr?.dataset?.id;
  if (!id) return;

  btn.disabled = true;
  try {
    const res = await fetch(`/api/users/${id}/increment`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || "Gagal menambah total");
      return;
    }
    const updated = await res.json(); // {id, username, total_buy, ...}

    // update ALL_USERS
    const idx = ALL_USERS.findIndex((u) => String(u.id) === String(id));
    if (idx >= 0) ALL_USERS[idx].total_buy = updated.total_buy;

    // update tampilan baris ini
    tr.querySelector(".total").textContent = updated.total_buy ?? 0;
  } finally {
    btn.disabled = false;
  }
});

// simple escape untuk keamanan output HTML
function escapeHtml(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

fetchUsers();
