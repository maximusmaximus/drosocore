export type RoleId =
  | "welder"
  | "coil"
  | "physicist"
  | "pipe"
  | "crane"
  | "inspector"
  | "electric"
  | "cryo"
  | "builder"
  | "safety"
  | "diag"
  | "coder"
  | "divertor"
  | "vacuum"
  | "magnet"
  | "janitor";

export type Role = {
  id: RoleId;
  title: string;
  tool: string;
  accent: string;
  designation: string;
};

export const ROLES: Role[] = [
  { id: "welder", title: "vessel welder", tool: "MIG gun + hood", accent: "#c45c4a", designation: "w¹¹¹⁸" },
  { id: "coil", title: "TF coil tech", tool: "winding bobbin", accent: "#3d6ea8", designation: "Tf-04" },
  { id: "physicist", title: "plasma physicist", tool: "tablet + goggles", accent: "#5eead4", designation: "ψ-9" },
  { id: "pipe", title: "cryoline fitter", tool: "pipe wrench", accent: "#b8733a", designation: "cn[1]" },
  { id: "crane", title: "crane operator", tool: "pendant remote", accent: "#c45c4a", designation: "h[1]" },
  { id: "inspector", title: "QA inspector", tool: "clipboard + loupe", accent: "#d2b13a", designation: "se" },
  { id: "electric", title: "busbar electrician", tool: "voltage tester", accent: "#e2b84a", designation: "e[11]" },
  { id: "cryo", title: "cryogenics", tool: "LHe dewar", accent: "#8ec5ff", designation: "He-4" },
  { id: "builder", title: "scaffold builder", tool: "I-beam + belt", accent: "#8a8680", designation: "vg[1]" },
  { id: "safety", title: "safety officer", tool: "stop paddle", accent: "#d2b13a", designation: "ss" },
  { id: "diag", title: "diagnostics", tool: "RF probe", accent: "#a78bfa", designation: "nₑ-2" },
  { id: "coder", title: "PCS systems", tool: "field laptop", accent: "#5eead4", designation: "Or-R" },
  { id: "divertor", title: "divertor tech", tool: "tungsten tile", accent: "#6b7280", designation: "div-B" },
  { id: "vacuum", title: "vacuum tech", tool: "turbo pump", accent: "#94a3b8", designation: "P-0" },
  { id: "magnet", title: "PF magnet tech", tool: "field magnet", accent: "#3d6ea8", designation: "b[1]" },
  { id: "janitor", title: "custodian", tool: "push broom", accent: "#c4a574", designation: "y[1]" },
];

export function roleById(id: string): Role {
  return ROLES.find((r) => r.id === id) ?? ROLES[0];
}
