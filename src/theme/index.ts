import { StyleSheet, useColorScheme } from 'react-native';
import { DarkTheme, DefaultTheme, type Theme as NavigationTheme } from 'expo-router';
import { palettes, type Palette } from './tokens';

export { radius, space, type } from './tokens';
export type { Palette, Tone, ToneName } from './tokens';

export interface Theme {
  dark: boolean;
  colors: Palette;
  /** For expo-router's ThemeProvider: headers, tab bar and screen backgrounds */
  navigation: NavigationTheme;
}

function buildTheme(dark: boolean): Theme {
  const colors = dark ? palettes.dark : palettes.light;
  const base = dark ? DarkTheme : DefaultTheme;
  return {
    dark,
    colors,
    navigation: {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.bg,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        notification: colors.tones.danger.fg,
      },
    },
  };
}

const themes = { light: buildTheme(false), dark: buildTheme(true) };

/** The light or dark theme, following the phone's setting */
export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? themes.dark : themes.light;
}

/**
 * Styles that depend on the theme. Define them once at module level, call the returned hook in
 * the component; each theme's StyleSheet is built once and reused.
 *
 *   const useStyles = makeStyles((t) => ({ box: { backgroundColor: t.colors.surface } }));
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(factory: (theme: Theme) => T) {
  const cache = new Map<Theme, T>();
  return function useStyles(): T {
    const theme = useTheme();
    let styles = cache.get(theme);
    if (!styles) {
      styles = StyleSheet.create(factory(theme));
      cache.set(theme, styles);
    }
    return styles;
  };
}
