import { jsx as e, jsxs as s } from "/vendor/react-jsx-runtime.js";
import "/vendor/react.js";
import { LayoutDashboard as f, List as c, Sliders as l, Settings as m, Database as d, TestTube as g } from "/vendor/lucide-react.js";
import o from "@modules/demo/uiText.json";
import i from "@modules/demo/constants.json";
import u from "@modules/demo/components/DemoDashboard";
import { Card as n, EmptyState as r } from "@shared";
const a = o.navItems, t = o.config, v = {
  id: i.moduleId,
  name: i.moduleName,
  shortName: i.moduleShortName,
  version: i.moduleVersion,
  description: i.moduleDescription,
  icon: g,
  roles: i.roles,
  enabled: !0,
  isCore: i.isCore,
  order: i.order,
  defaultView: i.defaultView,
  // ── Left SideNav items (mandatory: dashboard + config) ──────────────────
  navItems: [
    { id: "dashboard", label: a.dashboard, icon: f },
    { id: "items", label: a.items, icon: c },
    { id: "config", label: a.config, icon: l }
  ],
  // ── View renderer ───────────────────────────────────────────────────────
  getViews: () => ({
    dashboard: /* @__PURE__ */ e(u, {}),
    items: /* @__PURE__ */ e(b, {})
  }),
  // ── Config tabs (rendered when activeView === 'config') ─────────────────
  getConfigTabs: () => [
    { id: "demo_general", label: t.tabs.general, icon: m, content: /* @__PURE__ */ e(p, {}) },
    { id: "demo_data", label: t.tabs.data, icon: d, content: /* @__PURE__ */ e(x, {}) }
  ],
  configDefaultTab: "demo_general",
  configTitle: t.pageTitle,
  configSubtitle: t.pageSubtitle,
  configIcon: l
};
function b() {
  return /* @__PURE__ */ e("div", { className: "space-y-6 animate-fade-in", children: /* @__PURE__ */ e(n, { className: "flex flex-col items-center justify-center min-h-[400px]", children: /* @__PURE__ */ e(
    r,
    {
      icon: c,
      title: o.items.pageTitle,
      description: `${o.items.subtitle} — Coming in next iteration.`
    }
  ) }) });
}
function p() {
  return /* @__PURE__ */ s(n, { children: [
    /* @__PURE__ */ e("h3", { className: "text-sm font-bold text-surface-800 mb-1", children: t.general.title }),
    /* @__PURE__ */ e("p", { className: "text-xs text-surface-500 mb-4", children: t.general.description }),
    /* @__PURE__ */ e(r, { icon: m, title: t.general.title, description: "General config UI coming in next iteration." })
  ] });
}
function x() {
  return /* @__PURE__ */ s(n, { children: [
    /* @__PURE__ */ e("h3", { className: "text-sm font-bold text-surface-800 mb-1", children: t.data.title }),
    /* @__PURE__ */ e("p", { className: "text-xs text-surface-500 mb-4", children: t.data.description }),
    /* @__PURE__ */ e(r, { icon: d, title: t.data.title, description: "Demo data management UI coming in next iteration." })
  ] });
}
export {
  v as default
};
