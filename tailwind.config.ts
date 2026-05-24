import type { Config } from "tailwindcss";

// Design tokens mapped to Tailwind utilities.
// All raw values come from CSS variables in globals.css — use var() in components
// when possible; these Tailwind shortcuts are for ergonomic class usage.

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter Variable",
          "Inter",
          "system-ui",
          "-apple-system",
          "sans-serif"
        ],
        mono: [
          "Berkeley Mono",
          "ui-monospace",
          "SF Mono",
          "Menlo",
          "monospace"
        ]
      },
      fontSize: {
        xs:   ["12px", { lineHeight: "1.5",  letterSpacing: "-0.01em"  }],
        sm:   ["13px", { lineHeight: "1.5",  letterSpacing: "-0.01em"  }],
        base: ["15px", { lineHeight: "1.6",  letterSpacing: "-0.011em" }],
        md:   ["17px", { lineHeight: "1.5",  letterSpacing: "-0.012em" }],
        lg:   ["20px", { lineHeight: "1.35", letterSpacing: "-0.012em" }],
        xl:   ["24px", { lineHeight: "1.3",  letterSpacing: "-0.015em" }],
        "2xl":["32px", { lineHeight: "1.15", letterSpacing: "-0.022em" }],
      },
      fontWeight: {
        normal:   "400",
        medium:   "510",
        semibold: "590",
        bold:     "680"
      },
      colors: {
        /* Surface backgrounds */
        bg: {
          0: "#080809",
          1: "#0f1011",
          2: "#141516",
          3: "#191a1b",
          4: "#1e1f21"
        },
        /* Text */
        primary:   "#f2f2f2",
        secondary: "#c8cdd6",
        tertiary:  "#868b94",
        muted:     "#555962",
        /* Accent */
        accent: {
          DEFAULT: "#6c6fee",
          hover:   "#7d80f5",
          dim:     "rgba(108,111,238,0.15)"
        },
        /* Status */
        ok:    { DEFAULT: "#27a644", dim: "rgba(39,166,68,0.15)"   },
        warn:  { DEFAULT: "#e09000", dim: "rgba(224,144,0,0.15)"   },
        error: { DEFAULT: "#e5484d", dim: "rgba(229,72,77,0.15)"   },
        info:  { DEFAULT: "#4ea7fc", dim: "rgba(78,167,252,0.15)"  },
        /* Borders (use as border-border-0 etc.) */
        border: {
          0: "rgba(255,255,255,0.05)",
          1: "rgba(255,255,255,0.08)",
          2: "rgba(255,255,255,0.12)"
        }
      },
      borderRadius: {
        sm:  "4px",
        md:  "6px",
        lg:  "8px",
        xl:  "12px",
        "2xl": "16px",
        pill: "9999px"
      },
      boxShadow: {
        /* No shadows in dark mode — depth via bg steps only */
        "focus-ring": "0 0 0 2px rgba(108,111,238,0.5)"
      },
      transitionTimingFunction: {
        "out-quad":  "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        "out-cubic": "cubic-bezier(0.215, 0.61, 0.355, 1)",
        "out-expo":  "cubic-bezier(0.19, 1, 0.22, 1)",
        "in-out":    "cubic-bezier(0.645, 0.045, 0.355, 1)"
      },
      transitionDuration: {
        fast:   "100ms",
        normal: "200ms",
        slow:   "350ms"
      }
    }
  },
  plugins: []
};

export default config;
