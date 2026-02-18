// modules/sau/module.js — Sau MVP (list + add + individual + edit + events + soft delete)
import { makeEvent } from "../../core/events.js";

const now = () => new Date().toISOString();
const id = (p="a") => p + "_" + crypto.randomUUID();

function esc(s){ return String(s||"").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function escA(s){ return esc(s).replace(/"/g,"&quot;"); }
function fmtDT(iso){
  if(!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("no-NO",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"});
}

export async function renderSauList(ctx){
  const { db, state, ui } = ctx;
  const view = ui.viewEl;

  const dbState = await db.get("db");
  const animals = Object.values(dbState.animals||{}).filter(a => !a.deletedAt && a.productionType==="sau");
  animals.sort((a,b)=>(b.updatedAt||"").localeCompare(a.updatedAt||""));

  view.innerHTML = `
    <div class="grid">
      <div class="row">
        <div class="field" style="flex:1;min-width:220px">
          <label>Søk (øremark/ID)</label>
          <input id="q" placeholder="Søk…" />
        </div>
      </div>

      <div class="card" style="padding:0">
        <table>
          <thead>
            <tr><th>Øremerke / ID</th><th>Kjønn</th><th>Status</th><th>Sist endret</th></tr>
          </thead>
          <tbody id="rows"></tbody>
        </table>
      </div>

      <div class="card">
        <h3 style="margin-top:0">Legg til sau</h3>
        <div class="grid two">
          <div class="field">
            <label>Øremerke (valgfritt)</label>
            <input id="earTag" placeholder="f.eks. NO12345" />
          </div>
          <div class="field">
            <label>Kjønn</label>
            <select id="sex">
              <option value="female">Hunn</option>
              <option value="male">Hann</option>
              <option value="unknown">Ukjent</option>
            </select>
          </div>
          <div class="field">
            <label>Status</label>
            <select id="status">
              <option value="alive">I live</option>
              <option value="sold">Solgt</option>
              <option value="dead">Død</option>
            </select>
          </div>
          <div class="field">
            <label>Fødselsdato (valgfritt)</label>
            <input id="birthDate" type="date" />
          </div>
        </div>
        <div class="row" style="justify-content:flex-end;margin-top:10px">
          <button class="btn primary" id="add">Legg til</button>
        </div>
        <div class="muted" id="msg" style="margin-top:8px"></div>
      </div>
    </div>
  `;

  const rowsEl = view.querySelector("#rows");

  const renderRows = (list) => {
    rowsEl.innerHTML = list.map(a => `
      <tr style="cursor:pointer" data-id="${a.id}">
        <td><strong>${esc(a.externalId || a.earTag || a.id)}</strong></td>
        <td class="muted">${esc(a.sex)}</td>
        <td><span class="badge">${esc(a.status)}</span></td>
        <td class="muted">${fmtDT(a.updatedAt)}</td>
      </tr>
    `).join("") || `<tr><td colspan="4" class="muted">Ingen sau ennå.</td></tr>`;

    rowsEl.querySelectorAll("tr[data-id]").forEach(tr => {
      tr.onclick = () => location.hash = "#/sau/animal/" + tr.getAttribute("data-id");
    });
  };

  const applyFilter = () => {
    const q = (view.querySelector("#q").value || "").trim().toLowerCase();
    const filtered = animals.filter(a => !q || String(a.externalId||a.earTag||a.id).toLowerCase().includes(q));
    renderRows(filtered);
  };

  view.querySelector("#q").addEventListener("input", applyFilter);
  renderRows(animals);

  const setMsg = (t, err=false) => {
    const el = view.querySelector("#msg");
    el.textContent = t || "";
    el.style.color = err ? "var(--danger)" : "var(--muted)";
  };

  view.querySelector("#add").onclick = async () => {
    const earTag = (view.querySelector("#earTag").value || "").trim();
    const sex = view.querySelector("#sex").value;
    const status = view.querySelector("#status").value;
    const birthDate = view.querySelector("#birthDate").value || "";

    const user = state.activeUser;
    const aId = id("animal");
    const dId = id("sheep");

    await db.transaction(async (draft) => {
      draft.animals[aId] = {
        id: aId,
        productionType: "sau",
        externalId: earTag || aId,
        earTag,
        sex,
        birthDate,
        status,
        groupId: null,
        pastureId: null,
        active: true,
        createdAt: now(),
        updatedAt: now(),
        createdBy: user.id,
        updatedBy: user.id,
        deletedAt: null
      };
      draft.sheepDetails[dId] = {
        id: dId,
        animalId: aId,
        notes: "",
        active: true,
        createdAt: now(),
        updatedAt: now(),
        createdBy: user.id,
        updatedBy: user.id,
        deletedAt: null
      };
      draft.events.push(makeEvent({
        productionType: "sau",
        entityType: "animal",
        entityId: aId,
        eventType: "opprettet",
        date: now(),
        payload: { earTag, sex, status, birthDate },
        notes: "",
        userId: user.id
      }));
    });

    setMsg("Sau lagt til.");
    location.hash = "#/sau";
  };
}

export async function renderSauAnimal(ctx, animalId){
  const { db, state, ui } = ctx;
  const view = ui.viewEl;

  const dbState = await db.get("db");
  const a = dbState.animals?.[animalId];
  if (!a || a.deletedAt) {
    view.innerHTML = `<div class="muted">Fant ikke dyret (kan være slettet).</div>`;
    return;
  }
  const detail = Object.values(dbState.sheepDetails||{}).find(x => x.animalId===animalId && !x.deletedAt);

  const events = (dbState.events||[]).filter(ev => !ev.deletedAt && ev.entityType==="animal" && ev.entityId===animalId);
  events.sort((x,y)=>(y.date||"").localeCompare(x.date||""));

  const userById = Object.fromEntries(dbState.users.map(u => [u.id, u]));

  view.innerHTML = `
    <div class="grid">
      <div class="card">
        <div class="row" style="justify-content:space-between;align-items:center">
          <div>
            <div class="badge">Sau • ${esc(a.id)}</div>
            <h2 style="margin:8px 0 0 0">${esc(a.externalId || a.earTag || a.id)}</h2>
            <div class="muted">Status: <strong>${esc(a.status)}</strong></div>
          </div>
          <div class="row">
            <button class="btn" id="back">Til liste</button>
            <button class="btn danger" id="trash">Til papirkurv</button>
          </div>
        </div>
      </div>

      <div class="grid two">
        <div class="card">
          <h3 style="margin-top:0">Rediger</h3>
          <div class="grid">
            <div class="field">
              <label>Øremerke</label>
              <input id="earTag" value="${escA(a.earTag||"")}" />
            </div>
            <div class="field">
              <label>Kjønn</label>
              <select id="sex">
                <option value="female" ${a.sex==="female"?"selected":""}>Hunn</option>
                <option value="male" ${a.sex==="male"?"selected":""}>Hann</option>
                <option value="unknown" ${a.sex==="unknown"?"selected":""}>Ukjent</option>
              </select>
            </div>
            <div class="field">
              <label>Status</label>
              <select id="status">
                <option value="alive" ${a.status==="alive"?"selected":""}>I live</option>
                <option value="sold" ${a.status==="sold"?"selected":""}>Solgt</option>
                <option value="dead" ${a.status==="dead"?"selected":""}>Død</option>
              </select>
            </div>
            <div class="field">
              <label>Fødselsdato</label>
              <input id="birthDate" type="date" value="${escA(a.birthDate||"")}" />
            </div>
            <div class="field">
              <label>Notater (sau)</label>
              <input id="notes" value="${escA(detail?.notes||"")}" placeholder="Kort notat…" />
            </div>
          </div>
          <div class="row" style="justify-content:flex-end;margin-top:10px">
            <button class="btn primary" id="save">Lagre</button>
          </div>
          <div class="muted" id="saveMsg" style="margin-top:8px"></div>
        </div>

        <div class="card">
          <h3 style="margin-top:0">Ny hendelse</h3>
          <div class="grid">
            <div class="field">
              <label>Type</label>
              <select id="eventType">
                <option value="merking">Merking</option>
                <option value="parring">Parring</option>
                <option value="lamming">Lamming</option>
                <option value="behandling">Behandling</option>
                <option value="veiing">Veiing</option>
                <option value="annet">Annet</option>
              </select>
            </div>
            <div class="field">
              <label>Dato/tid</label>
              <input id="eventDate" type="datetime-local" />
            </div>
            <div class="field">
              <label>Notat</label>
              <input id="eventNote" placeholder="Kort notat…" />
            </div>
          </div>
          <div class="row" style="justify-content:flex-end;margin-top:10px">
            <button class="btn primary" id="addEvent">Legg til hendelse</button>
          </div>
          <div class="muted" id="eventMsg" style="margin-top:8px"></div>
        </div>
      </div>

      <div class="card" style="padding:0">
        <table>
          <thead><tr><th>Dato</th><th>Type</th><th>Notat</th><th>Endret av</th><th></th></tr></thead>
          <tbody id="eventRows"></tbody>
        </table>
      </div>
    </div>
  `;

  view.querySelector("#back").onclick = () => location.hash = "#/sau";

  view.querySelector("#trash").onclick = async () => {
    const user = state.activeUser;
    await db.transaction(async (draft) => {
      const cur = draft.animals[animalId];
      if (!cur) return;
      cur.deletedAt = now();
      cur.updatedAt = now();
      cur.updatedBy = user.id;
      draft.trash.animals.push({ id: animalId, deletedAt: cur.deletedAt });
    });
    location.hash = "#/sau";
  };

  const setSaveMsg = (t, err=false) => {
    const el = view.querySelector("#saveMsg");
    el.textContent = t || "";
    el.style.color = err ? "var(--danger)" : "var(--muted)";
  };

  view.querySelector("#save").onclick = async () => {
    const user = state.activeUser;
    const earTag = (view.querySelector("#earTag").value || "").trim();
    const sex = view.querySelector("#sex").value;
    const status = view.querySelector("#status").value;
    const birthDate = view.querySelector("#birthDate").value || "";
    const notes = view.querySelector("#notes").value || "";

    await db.transaction(async (draft) => {
      const cur = draft.animals[animalId];
      if (!cur) return;
      cur.earTag = earTag;
      cur.externalId = earTag || cur.externalId || cur.id;
      cur.sex = sex;
      cur.status = status;
      cur.birthDate = birthDate;
      cur.updatedAt = now();
      cur.updatedBy = user.id;

      const det = Object.values(draft.sheepDetails||{}).find(x => x.animalId===animalId && !x.deletedAt);
      if (det) {
        det.notes = notes;
        det.updatedAt = now();
        det.updatedBy = user.id;
      }

      draft.events.push(makeEvent({
        productionType: "sau",
        entityType: "animal",
        entityId: animalId,
        eventType: "endret",
        date: now(),
        payload: { earTag, sex, status, birthDate },
        notes: "",
        userId: user.id
      }));
    });

    setSaveMsg("Lagret.");
    location.hash = "#/sau/animal/" + animalId;
  };

  const setEventMsg = (t, err=false) => {
    const el = view.querySelector("#eventMsg");
    el.textContent = t || "";
    el.style.color = err ? "var(--danger)" : "var(--muted)";
  };

  view.querySelector("#addEvent").onclick = async () => {
    const user = state.activeUser;
    const eventType = view.querySelector("#eventType").value;
    const dt = view.querySelector("#eventDate").value;
    const notes = view.querySelector("#eventNote").value || "";
    const date = dt ? new Date(dt).toISOString() : now();

    await db.transaction(async (draft) => {
      draft.events.push(makeEvent({
        productionType: "sau",
        entityType: "animal",
        entityId: animalId,
        eventType,
        date,
        payload: {},
        notes,
        userId: user.id
      }));
    });

    setEventMsg("Hendelse lagt til.");
    location.hash = "#/sau/animal/" + animalId;
  };

  const eventRows = view.querySelector("#eventRows");

  const renderEventRows = () => {
    eventRows.innerHTML = events.map(ev => `
      <tr>
        <td>${fmtDT(ev.date)}</td>
        <td><span class="badge">${esc(ev.eventType)}</span></td>
        <td>${esc(ev.notes || "")}</td>
        <td class="muted">${esc(userById[ev.updatedBy]?.name || ev.updatedBy || "")}</td>
        <td style="text-align:right"><button class="btn" data-edit="${ev.id}">Rediger</button></td>
      </tr>
    `).join("") || `<tr><td colspan="5" class="muted">Ingen hendelser ennå.</td></tr>`;

    eventRows.querySelectorAll("button[data-edit]").forEach(btn => {
      btn.onclick = () => openEdit(btn.getAttribute("data-edit"));
    });
  };

  const openEdit = (eventId) => {
    const ev = events.find(x => x.id === eventId);
    if (!ev) return;
    const note = prompt("Rediger notat:", ev.notes || "");
    if (note === null) return;
    ctx.db.transaction(async (draft) => {
      const idx = draft.events.findIndex(x => x.id === eventId);
      if (idx < 0) return;
      draft.events[idx].notes = note;
      draft.events[idx].updatedAt = now();
      draft.events[idx].updatedBy = ctx.state.activeUser.id;
    }).then(() => location.hash = "#/sau/animal/" + animalId);
  };

  renderEventRows();
}
