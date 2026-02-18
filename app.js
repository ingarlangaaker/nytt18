// app.js — bootstrap Core v1.2
import { DB } from "./core/db/index.js";
import { createRouter } from "./core/router.js";
import { renderTopNav, renderSidebar, setHeader, setActions } from "./core/ui/layout.js";
import { getActiveUser } from "./core/auth.js";

import { renderMinGard } from "./modules/minGard/module.js";
import { renderSauList, renderSauAnimal } from "./modules/sau/module.js";
import { renderSkifterList, renderSkifte } from "./modules/plante/module.js";
import { renderSkiftePlan } from "./modules/plante/plan.js";
import { renderPlanteJournal } from "./modules/plante/journal.js";
import { renderJobb } from "./modules/jobb/module.js";
import { renderTrash } from "./modules/trash/module.js";
import { renderBackup } from "./modules/backup/module.js";

const ui = {
  topnavEl: document.getElementById("topnav"),
  sidebarEl: document.getElementById("sidebar"),
  userchipEl: document.getElementById("userchip"),
  titleEl: document.getElementById("viewTitle"),
  subEl: document.getElementById("viewSub"),
  actionsEl: document.getElementById("viewActions"),
  viewEl: document.getElementById("view"),
  footerStatusEl: document.getElementById("footerStatus"),
  brandSubEl: document.getElementById("brandSub")
};

const db = new DB();

// BOOTSTRAP_GUARD
async function boot(){
  try {

await db.init();

const state = {
  dbState: await db.get("db"),
  activeUser: null
};

async function refreshState() {
  const s = await db.get("db");
  state.dbState = s;
  state.activeUser = getActiveUser(s);
  ui.userchipEl.textContent = "👤 " + state.activeUser.name;
  ui.footerStatusEl.textContent = s.updatedAt ? ("Sist lagret: " + new Date(s.updatedAt).toLocaleString("no-NO")) : "";
}
await refreshState();

const router = createRouter();

function appShell(currentPath) {
  const top = [
    { label: "Hjem", path: "/"},
    { label: "Min gård", path: "/min-gard" },
    { label: "Jobb", path: "/jobb" },
  ];
  if (state.dbState.features.productionModules.plante) top.push({ label: "Plante", path: "/plante" });
  if (state.dbState.features.productionModules.sau) top.push({ label: "Sau", path: "/sau" });
  renderTopNav(ui.topnavEl, top, currentPath);

  const side = [
    { label: "Hjem", path: "/", icon:"🏠" },
    { label: "Min gård", path: "/min-gard", icon:"⚙️" },
    { label: "Jobb", path: "/jobb", icon:"⏱️" },
    { label: "Papirkurv", path: "/papirkurv", icon:"🗑️" },
    { label: "Backup", path: "/backup", icon:"💾" },
  ];
  if (state.dbState.features.productionModules.plante) side.push({ label: "Plante", path: "/plante", icon:"🌾" });
  if (state.dbState.features.productionModules.sau) side.push({ label: "Sau", path: "/sau", icon:"🐑" });
  renderSidebar(ui.sidebarEl, side, currentPath);
}

function ctx() { return { db, state, ui }; }

router.on("/", async () => {
  await refreshState();
  appShell("/");
  setHeader(ui, "Hjem", "Stabil kjerne (Core v1.2)");
  setActions(ui.actionsEl, [
    { label: "Min gård", primary: true, onClick: () => location.hash = "#/min-gard" },
    { label: "Jobbklokke", onClick: () => location.hash = "#/jobb" },
    { label: "Skifter", onClick: () => location.hash = "#/plante" },
    { label: "Journal", onClick: () => location.hash = "#/plante/journal" },
    { label: "yr.no", onClick: () => window.open("https://www.yr.no", "_blank", "noopener,noreferrer") }
  ]);
  ui.viewEl.innerHTML = `
    <div class="grid">
      <div class="card">
        <div class="badge">Status</div>
        <h2 style="margin:8px 0 0 0">Core v1.2 er oppe</h2>
        <div class="muted">DB wrapper • Brukere • Skifter • Sau • Events</div>
      </div>

      <div class="grid two">
        <div class="card">
          <h3 style="margin-top:0">Neste lag</h3>
          <ul class="muted" style="margin:8px 0 0 16px">
            <li>Journal: sprøyting/gjødsel (logg)</li>
            <li>PDF: sprøytejournal/gjødseljournal (proff)</li>
            <li>Regelmotor: varsler/blokkering</li>
          </ul>
        </div>
        <div class="card">
          <h3 style="margin-top:0">Aktiv bruker</h3>
          <div class="muted">Du er logget som <strong>${state.activeUser.name}</strong> (${state.activeUser.role}).</div>
          <div class="muted" style="margin-top:8px">Bytt bruker i <strong>Min gård</strong>.</div>
        </div>
      </div>
    </div>
  `;
});

router.on("/min-gard", async () => {
  await refreshState();
  appShell("/min-gard");
  setHeader(ui, "Min gård", "Bruker, kommune og aktive produksjoner");
  setActions(ui.actionsEl, []);
  await renderMinGard(ctx());
});

router.on("/plante", async () => {
  await refreshState();
  appShell("/plante");
  setHeader(ui, "Plante — skifter", "Skifter med fulldyrket, overflatedyrket og innmarksbeite");
  setActions(ui.actionsEl, [
    { label: "Skifteplan", onClick: () => location.hash = "#/plante/plan" },
    { label: "Journal", onClick: () => location.hash = "#/plante/journal" }
  ]);
  await renderSkifterList(ctx());
});

router.on("/plante/skifte/:id", async ({ params }) => {
  await refreshState();
  appShell("/plante");
  setHeader(ui, "Skifte", "Rediger arealer og logg hendelser");
  setActions(ui.actionsEl, []);
  await renderSkifte(ctx(), params.id);
});

router.on("/jobb", async () => {
  await refreshState();
  appShell("/jobb");
  setHeader(ui, "Jobb", "Start/stopp jobbeklokke og historikk");
  setActions(ui.actionsEl, [
    { label: "Åpne yr.no", onClick: () => window.open("https://www.yr.no", "_blank", "noopener,noreferrer") }
  ]);
  await renderJobb(ctx());
});

router.on("/papirkurv", async () => {
  await refreshState();
  appShell("/papirkurv");
  setHeader(ui, "Papirkurv", "Gjenopprett slettede elementer");
  setActions(ui.actionsEl, []);
  await renderTrash(ctx());
});

router.on("/backup", async () => {
  await refreshState();
  appShell("/backup");
  setHeader(ui, "Backup", "Eksport / import av data");
  setActions(ui.actionsEl, []);
  await renderBackup(ctx());
});

router.on("/plante/plan", async () => {
  await refreshState();
  appShell("/plante");
  setHeader(ui, "Skifteplan", "Årshjul og plan for skifter");
  setActions(ui.actionsEl, []);
  await renderSkiftePlan(ctx());
});

router.on("/plante/journal", async () => {
  await refreshState();
  appShell("/plante");
  setHeader(ui, "Journal", "Gjødseljournal og sprøytejournal + PDF");
  setActions(ui.actionsEl, []);
  await renderPlanteJournal(ctx());
});

router.on("/sau", async () => {
  await refreshState();
  appShell("/sau");
  setHeader(ui, "Sau", "Liste, søk og legg til dyr");
  setActions(ui.actionsEl, []);
  await renderSauList(ctx());
});

router.on("/sau/animal/:id", async ({ params }) => {
  await refreshState();
  appShell("/sau");
  setHeader(ui, "Sau — individ", "Vis og rediger, legg til hendelser");
  setActions(ui.actionsEl, []);
  await renderSauAnimal(ctx(), params.id);
});

router.on("/404", async () => {
  await refreshState();
  appShell("/");
  setHeader(ui, "Fant ikke siden", "Fallback");
  setActions(ui.actionsEl, [{ label:"Til Hjem", primary:true, onClick:()=>location.hash="#/" }]);
  ui.viewEl.innerHTML = `<div class="muted">Siden finnes ikke. Bruk menyen.</div>`;
});

router.navigate();
  } catch (err) {
    console.error(err);
    const msg = (err && err.message) ? err.message : String(err);
    ui.topnavEl.innerHTML = '';
    ui.sidebarEl.innerHTML = '';
    ui.titleEl.textContent = 'Feil ved oppstart';
    ui.subEl.textContent = 'Sjekk Console for detaljer';
    ui.actionsEl.innerHTML = '';
    ui.viewEl.innerHTML = `<div class="grid"><div class="card"><div class="badge">Crash</div><h2 style="margin:8px 0 0 0">Appen stoppet</h2><div class="muted" style="margin-top:8px">${msg}</div><div class="muted" style="margin-top:10px">Send meg teksten over, så fikser jeg på første forsøk.</div></div></div>`;
  }
}
boot();
