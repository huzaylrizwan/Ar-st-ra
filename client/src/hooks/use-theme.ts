import { useSettings } from "./use-settings";

const VALID_THEMES = ["dark-obsidian", "white-marble", "warm-dusk"] as const;
type ThemeName = typeof VALID_THEMES[number];

function isValidTheme(v: string | null | undefined): v is ThemeName {
  return VALID_THEMES.includes(v as ThemeName);
}

export function useTheme() {
  const { data: settings } = useSettings();
  const activeTheme = isValidTheme(settings?.activeThemePreset)
    ? settings!.activeThemePreset
    : "dark-obsidian";
  return activeTheme as ThemeName;
}
