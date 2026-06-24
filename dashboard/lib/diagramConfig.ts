import { DiagramElementType, DiagramConnectionType } from "./types";

export interface ElementConfig {
  icon: string; // path under /public to a real PNG icon, user-supplied
  label: string;
}

export const ELEMENT_CFG: Record<DiagramElementType, ElementConfig> = {
  well: { icon: "/diagram-icons/well.png", label: "Well" },
  motor: { icon: "/diagram-icons/motor.png", label: "Motor" },
  valve: { icon: "/diagram-icons/valve.png", label: "Valve" },
  electricity_pole: { icon: "/diagram-icons/electricity-pole.png", label: "Elec. Pole" },
  pipe_junction: { icon: "/diagram-icons/pipe-junction.png", label: "Junction" },
  pipe_end: { icon: "/diagram-icons/pipe-end.png", label: "Pipe End" },
};

export interface ConnectionConfig {
  color: string;
  label: string;
  symbol: string;
}

export const CONN_CFG: Record<DiagramConnectionType, ConnectionConfig> = {
  pipe: { color: "#0ea5e9", label: "Pipe",  symbol: "〜" },
  wire: { color: "#f59e0b", label: "Wire",  symbol: "≡" },
};
