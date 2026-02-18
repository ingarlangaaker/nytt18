// modules/minGard/module.js — settings: active user + geo selection + module toggles
import geo from "../../data/geo/municipalities.min.json" assert { type: "json" };

export async function renderMinGard(ctx) {
  const { db, state, ui } = ctx;
  const view = ui.viewEl;

  const dbState = await db.get("db");
  const user = state.activeUser;

  const counties = geo.counties;

  const countyOptions = counties.map(c => `<option value="${c.code}" ${dbState.meta.geo.countyCode===c.code?"selected":""}>${c.name}</option>`).join("");
  const selectedCounty = counties.find(c => c.code === dbState.meta.geo.countyCode) || counties[0];
  const munis = selectedCounty?.municipalities || [];
  const muniOptions = munis.map(m => `<option value="${m.code}" ${dbState.meta.geo.municipalityCode===m.code?"selected":""}>${m.name}</option>`).join("");

  view.innerHTML = `
    <div class="grid">
      <div class="card" style="background:linear-gradient(180deg,#121a22,#0e1620)">
        <div class="badge">RBAC-light</div>
        <h2 style="margin:8px 0 0 0">Min gård</h2>
        <div class="muted">Velg aktiv bruker, kommune og aktive produksjoner.</div>
      </div>

      <div class="grid two">
        <div class="card">
          <h3 style="margin-top:0">Aktiv bruker</h3>
          <div class="field">
            <label>Velg bruker</label>
            <select id="activeUser">
              ${dbState.users.map(u => `<option value="${u.id}" ${dbState.activeUserId===u.id?"selected":""}>${u.name} (${u.role})</option>`).join("")}
            </select>
          </div>
          <div class="muted" style="margin-top:8px">Owner kan endre innstillinger og eksportere tilsynspakke. Avløser kan ikke.</div>
        </div>

        <div class="card">
          <h3 style="margin-top:0">Geografi (for regelpakker / jordbruksavtale)</h3>
          <div class="grid">
            <div class="field">
              <label>Fylke</label>
              <select id="county">
                <option value="">Velg fylke…</option>
                ${countyOptions}
              </select>
            </div>
            <div class="field">
              <label>Kommune</label>
              <select id="municipality">
                <option value="">Velg kommune…</option>
                ${muniOptions}
              </select>
            </div>
          </div>
          <div class="muted" style="margin-top:8px">
            Soner vises ikke her. Soner brukes senere i beregninger basert på kommunenummer.
          </div>
        </div>
      </div>

      <div class="card">
        <h3 style="margin-top:0">Aktive produksjoner</h3>
        <div class="row">
          ${Object.entries(dbState.features.productionModules).map(([k,v]) => `
            <label class="badge" style="cursor:${user.role==='owner'?'pointer':'not-allowed'}">
              <input type="checkbox" data-mod="${k}" ${v?"checked":""} ${user.role!=='owner'?'disabled':''} />
              ${k}
            </label>
          `).join("")}
        </div>
        <div class="muted" style="margin-top:10px">Deaktivering skjuler modulen, men data beholdes.</div>
      </div>
    </div>
  `;

  view.querySelector("#activeUser")?.addEventListener("change", async (e) => {
    const nextId = e.target.value;
    await db.transaction(async (draft) => { draft.activeUserId = nextId; });
    location.hash = "#/min-gard";
  });

  view.querySelector("#county")?.addEventListener("change", async (e) => {
    const code = e.target.value;
    const c = counties.find(x => x.code === code);
    await db.transaction(async (draft) => {
      draft.meta.geo.countyCode = code || "";
      draft.meta.geo.countyName = c?.name || "";
      draft.meta.geo.municipalityCode = "";
      draft.meta.geo.municipalityName = "";
    });
    location.hash = "#/min-gard";
  });

  view.querySelector("#municipality")?.addEventListener("change", async (e) => {
    const code = e.target.value;
    const muni = (selectedCounty?.municipalities || []).find(m => m.code === code);
    await db.transaction(async (draft) => {
      draft.meta.geo.municipalityCode = code || "";
      draft.meta.geo.municipalityName = muni?.name || "";
    });
  });

  view.querySelectorAll("input[type=checkbox][data-mod]")?.forEach(chk => {
    chk.addEventListener("change", async (e) => {
      const mod = e.target.getAttribute("data-mod");
      if (user.role !== "owner") return;
      await db.transaction(async (draft) => {
        draft.features.productionModules[mod] = !!e.target.checked;
      });
    });
  });
}
