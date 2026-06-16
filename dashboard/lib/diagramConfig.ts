import { DiagramElementType, DiagramConnectionType } from "./types";

export interface ElementConfig {
  gradient: string;
  label: string;
  svg: string;
}

export const ELEMENT_CFG: Record<DiagramElementType, ElementConfig> = {
  well: {
    gradient: "linear-gradient(145deg, #38bdf8, #0369a1)",
    label: "Well",
    svg: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 10L12 4L21 10" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="6" y="10" width="12" height="10" rx="1.2" stroke="white" stroke-width="1.8" fill="rgba(255,255,255,0.12)"/>
      <path d="M8.5 17Q10 15 11.5 17Q13 19 14.5 17Q16 15 16.5 16.5"
            stroke="rgba(255,255,255,0.9)" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    </svg>`,
  },

  motor: {
    gradient: "linear-gradient(145deg, #4ade80, #15803d)",
    label: "Motor",
    svg: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8.5" stroke="white" stroke-width="1.8" fill="rgba(255,255,255,0.1)"/>
      <circle cx="12" cy="12" r="3" fill="white"/>
      <path d="M12 4.5C15.5 4.5 19.5 8 19.5 12" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M19.5 14.5C18 18.5 14.5 19.5 12 19.5" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M9.5 19C6 17.5 4.5 14.5 4.5 12" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M14.5 3.5L12 5.5L15 6.5" stroke="white" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  },

  valve: {
    gradient: "linear-gradient(145deg, #c084fc, #7c3aed)",
    label: "Valve",
    svg: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <line x1="1" y1="12" x2="8" y2="12" stroke="white" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="16" y1="12" x2="23" y2="12" stroke="white" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M8 7L8 17L16 12Z" fill="white"/>
      <path d="M16 7L16 17L8 12Z" fill="rgba(255,255,255,0.3)" stroke="white" stroke-width="1.4" stroke-linejoin="round"/>
      <line x1="12" y1="7" x2="12" y2="4" stroke="white" stroke-width="2.2" stroke-linecap="round"/>
      <rect x="9" y="2.5" width="6" height="2" rx="1" fill="white"/>
    </svg>`,
  },

  electricity_pole: {
    gradient: "linear-gradient(145deg, #fcd34d, #b45309)",
    label: "Elec. Pole",
    svg: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <line x1="12" y1="2" x2="12" y2="23" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="5" y1="7" x2="19" y2="7" stroke="white" stroke-width="2" stroke-linecap="round"/>
      <path d="M5 7C4.5 11 4 13.5 3.5 16" stroke="rgba(255,255,255,0.6)" stroke-width="1.2" fill="none" stroke-linecap="round"/>
      <path d="M19 7C19.5 11 20 13.5 20.5 16" stroke="rgba(255,255,255,0.6)" stroke-width="1.2" fill="none" stroke-linecap="round"/>
      <path d="M14.5 3L11.5 9H14L10.5 15.5L16 8.5H13Z" fill="rgba(255,255,255,0.95)"/>
    </svg>`,
  },

  pipe_junction: {
    gradient: "linear-gradient(145deg, #a8a29e, #57534e)",
    label: "Junction",
    svg: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <line x1="2" y1="12" x2="22" y2="12" stroke="white" stroke-width="4.5" stroke-linecap="round"/>
      <line x1="12" y1="2" x2="12" y2="22" stroke="white" stroke-width="4.5" stroke-linecap="round"/>
      <circle cx="12" cy="12" r="4.5" fill="white"/>
    </svg>`,
  },
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
