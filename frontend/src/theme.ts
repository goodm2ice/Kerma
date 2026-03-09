import { extendTheme } from "@chakra-ui/react";

export const theme = extendTheme({
  config: {
    initialColorMode: "light",
    useSystemColorMode: false
  },
  fonts: {
    heading: "'Segoe UI Variable', 'Segoe UI', sans-serif",
    body: "'Segoe UI Variable', 'Segoe UI', sans-serif"
  },
  styles: {
    global: {
      body: {
        bg: "appBg",
        color: "bodyText",
        transitionProperty: "background-color, color",
        transitionDuration: "normal"
      }
    }
  },
  semanticTokens: {
    colors: {
      appBg: { default: "#f4eadf", _dark: "#16120f" },
      bodyText: { default: "#241b16", _dark: "#f7efe8" },
      panelBg: { default: "#fffaf4", _dark: "#211b17" },
      panelBorder: { default: "#e2d5c4", _dark: "#4a3d34" },
      subtleBg: { default: "#f7efe3", _dark: "#2a231e" },
      subtleBorder: { default: "#dfd2c4", _dark: "#43372f" },
      selectedBg: { default: "#fbe5d0", _dark: "#4f331f" },
      selectedBorder: { default: "#e8b98a", _dark: "#dd9a59" },
      imageBg: { default: "#ede3d6", _dark: "#362d27" },
      mutedText: { default: "#5f534a", _dark: "#c9baad" },
      secondaryText: { default: "#7a6d63", _dark: "#a8998d" }
    }
  },
  colors: {
    brand: {
      50: "#f8efe1",
      100: "#eddab8",
      200: "#dfc38b",
      300: "#cda461",
      400: "#af7d3d",
      500: "#8f5f29",
      600: "#72471f",
      700: "#563317",
      800: "#39210f",
      900: "#201106"
    },
    accent: {
      50: "#edf5f7",
      100: "#cee2e8",
      200: "#a7cad5",
      300: "#7eaec0",
      400: "#4e879e",
      500: "#2d6a82",
      600: "#1e5367",
      700: "#153d4c",
      800: "#0c2732",
      900: "#041218"
    }
  },
  radii: {
    xl: "20px",
    "2xl": "28px",
    "3xl": "32px"
  },
  components: {
    Button: {
      defaultProps: {
        borderRadius: "full"
      }
    },
    Input: {
      defaultProps: {
        focusBorderColor: "orange.400"
      }
    },
    Textarea: {
      defaultProps: {
        focusBorderColor: "orange.400"
      }
    },
    Select: {
      defaultProps: {
        focusBorderColor: "orange.400"
      }
    }
  }
});
