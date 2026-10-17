
const KEY = "lesku_data_v2";
let lessons = [];
let filter = "upcoming";

const $ = id => document.getElementById(id);

function today() {
  const d = new Date();
  return d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0");
}

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || "[]");
    lessons = Array.isArray(data) ? data : [];
  } catch {
    lessons = [];
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(lessons));
    render();
  } catch {
    alert("Data gagal disimpan. Periksa penyimpanan browser.");
  }
}

function dateText(date) {
  return new Date(date + "T12:00:00").toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function statusText(s) {
  return ({
    pending: "Belum dikonfirmasi",
    ikut: "Ikut les",
    tidak: "Tidak ikut",
    sakit: "Sakit",
    urusan: "Urusan mendadak",
    selesai: "Selesai"
  })[s] || s;
}

function render() {
  const now = today();

  $("upcoming").textContent =
    lessons.filter(x => x.date >= now && x.status !== "selesai").length;

  $("attending").textContent =
    lessons.filter(x => x.status === "ikut").length;

  $("absent").textContent =
    lessons.filter(x => ["tidak", "sakit", "urusan"].includes(x.status)).length;

  let items = [...lessons].sort((a, b) =>
    (a.date + a.time).localeCompare(b.date + b.time)
  );

  if (filter === "upcoming") {
    items = items.filter(x => x.date >= now && x.status !== "selesai");
  } else if (filter === "history") {
    items = items.filter(x => x.date < now || x.status === "selesai");
  }

  const root = $("lessonList");
  root.replaceChildren();

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "Belum ada jadwal di bagian ini.";
    root.appendChild(empty);
    return;
  }

  items.forEach(x => {
    const card = document.createElement("article");
    card.className = "lesson-card";

    const title = document.createElement("h3");
    title.textContent = x.name;
    card.appendChild(title);

    const info = document.createElement("p");
    info.className = "lesson-info";
    info.textContent = dateText(x.date) + " · " + x.time +
      (x.place ? " · " + x.place : "");
    card.appendChild(info);

    if (x.notes) {
      const note = document.createElement("p");
      note.className = "muted";
      note.textContent = "Catatan: " + x.notes;
      card.appendChild(note);
    }

    const status = document.createElement("p");
    status.className = "status-text";
    status.textContent = "Status: " + statusText(x.status) +
      (x.reason ? " · Alasan: " + x.reason : "");
    card.appendChild(status);

    const group = document.createElement("div");
    group.className = "attendance-options";

    [
      ["ikut", "Ikut les"],
      ["tidak", "Tidak ikut"],
      ["sakit", "Sakit"],
      ["urusan", "Urusan mendadak"]
    ].forEach(([value, label]) => {
      const wrapper = document.createElement("label");
      wrapper.className = "attendance-option";

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "attendance-" + x.id;
      radio.value = value;
      radio.checked = x.status === value;

      const text = document.createElement("span");
      text.textContent = label;

      radio.addEventListener("change", () => setStatus(x.id, value));

      wrapper.append(radio, text);
      group.appendChild(wrapper);
    });

    card.appendChild(group);

    const done = document.createElement("button");
    done.className = "secondary";
    done.textContent = x.status === "selesai"
      ? "Batalkan selesai" : "Tandai selesai";
    done.onclick = () => {
      x.status = x.status === "selesai" ? "pending" : "selesai";
      x.reason = "";
      save();
    };
    card.appendChild(done);

    const del = document.createElement("button");
    del.className = "danger";
    del.textContent = "Hapus jadwal";
    del.onclick = () => {
      if (confirm("Hapus jadwal " + x.name + "?")) {
        lessons = lessons.filter(y => y.id !== x.id);
        save();
      }
    };
    card.appendChild(del);

    root.appendChild(card);
  });
}

function setStatus(id, value) {
  const x = lessons.find(y => y.id === id);
  if (!x) return;

  x.reason = "";

  if (value === "ikut") {
    x.status = "ikut";
  } else if (value === "tidak") {
    const reason = prompt(
      "Pilih alasan dengan mengetik:\n1 = Sakit\n2 = Urusan mendadak",
      "1"
    );

    if (reason === null) {
      render();
      return;
    }

    if (reason === "1") {
      x.status = "sakit";
      x.reason = "Sakit";
    } else if (reason === "2") {
      x.status = "urusan";
      x.reason = "Urusan mendadak";
    } else {
      alert("Pilihan tidak valid.");
      render();
      return;
    }
  } else if (value === "sakit") {
    x.status = "sakit";
    x.reason = "Sakit";
  } else if (value === "urusan") {
    x.status = "urusan";
    x.reason = "Urusan mendadak";
  }

  save();
}

$("lessonForm").addEventListener("submit", e => {
  e.preventDefault();

  if ($("date").value < today()) {
    if (!confirm("Tanggal sudah lewat. Simpan ke riwayat?")) return;
  }

  lessons.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    name: $("name").value.trim(),
    place: $("place").value.trim(),
    date: $("date").value,
    time: $("time").value,
    notes: $("notes").value.trim(),
    status: "pending",
    reason: "",
    notified: []
  });

  save();
  $("lessonForm").reset();
  $("date").value = today();
  $("time").value = "16:00";
});

document.querySelectorAll("[data-filter]").forEach(btn => {
  btn.addEventListener("click", () => {
    filter = btn.dataset.filter;

    document.querySelectorAll("[data-filter]").forEach(b => {
      b.classList.toggle("secondary", b !== btn);
    });

    render();
  });
});

$("enableNotifications").addEventListener("click", async () => {
  if (!("Notification" in window)) {
    alert("Browser ini tidak mendukung notifikasi web.");
    return;
  }

  try {
    const result = await Notification.requestPermission();
    alert(result === "granted"
      ? "Izin notifikasi diberikan. Halaman tetap perlu aktif."
      : "Izin notifikasi belum diberikan.");
  } catch {
    alert("Coba akses LesKu melalui HTTPS.");
  }
});

function checkReminders() {
  const d = new Date();
  const now = today();
  const minutes = d.getHours() * 60 + d.getMinutes();

  if (minutes < 420 || minutes > 430) return;

  lessons.forEach(x => {
    if (x.status === "selesai") return;

    const t = new Date(x.date + "T12:00:00");
    t.setDate(t.getDate() - 1);

    const previous = t.getFullYear() + "-" +
      String(t.getMonth() + 1).padStart(2, "0") + "-" +
      String(t.getDate()).padStart(2, "0");

    const type = previous === now ? "H-1"
      : x.date === now ? "Hari H" : null;

    if (!type) return;

    const key = type + "-" + now;
    if ((x.notified || []).includes(key)) return;

    x.notified = x.notified || [];
    x.notified.push(key);

    const message = x.name +
      (type === "H-1" ? " besok" : " hari ini") +
      " pukul " + x.time;

    $("notice").textContent = "🔔 " + type + ": " + message;
    localStorage.setItem(KEY, JSON.stringify(lessons));

    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification("LesKu · " + type, { body: message });
      } catch {}
    }
  });
}

$("exportData").onclick = () => {
  const blob = new Blob([JSON.stringify(lessons, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cadangan-lesku.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

$("importButton").onclick = () => $("importFile").click();

$("importFile").addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const data = JSON.parse(await file.text());

    if (!Array.isArray(data) || !data.every(x =>
      x && typeof x.id === "string" &&
      typeof x.name === "string" &&
      typeof x.date === "string" &&
      typeof x.time === "string"
    )) throw new Error("Format tidak sesuai");

    if (confirm("Ganti jadwal saat ini dengan data cadangan?")) {
      lessons = data;
      save();
      alert("Data berhasil diimpor.");
    }
  } catch {
    alert("File cadangan tidak valid.");
  }

  e.target.value = "";
});

$("date").min = today();
$("date").value = today();

load();
render();
checkReminders();
setInterval(checkReminders, 60000);
