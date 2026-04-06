export type AppTheme = 'light' | 'dark' | 'auto';

const LEGACY_THEME_STORAGE_KEY = 'app_theme';
const LAST_ACCOUNT_STORAGE_KEY = 'last_account_id';

const isValidTheme = (value: string | null): value is AppTheme => {
  return value === 'light' || value === 'dark' || value === 'auto';
};

const normalizeAccountId = (accountId?: string | null) => {
  return accountId?.trim() || '';
};

export const getThemeStorageKey = (accountId?: string | null) => {
  const normalizedAccountId = normalizeAccountId(accountId);
  return normalizedAccountId ? `${LEGACY_THEME_STORAGE_KEY}:${normalizedAccountId}` : LEGACY_THEME_STORAGE_KEY;
};

export const migrateLegacyTheme = () => {
  const legacyTheme = localStorage.getItem(LEGACY_THEME_STORAGE_KEY);

  if (!isValidTheme(legacyTheme)) {
    return;
  }

  const lastAccountId = localStorage.getItem(LAST_ACCOUNT_STORAGE_KEY);
  const normalizedAccountId = normalizeAccountId(lastAccountId);

  if (normalizedAccountId) {
    const accountThemeKey = getThemeStorageKey(normalizedAccountId);
    if (!localStorage.getItem(accountThemeKey)) {
      localStorage.setItem(accountThemeKey, legacyTheme);
    }
  }

  localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
};

export const getStoredTheme = (accountId?: string | null): AppTheme => {
  const normalizedAccountId = normalizeAccountId(accountId);
  const storedTheme = normalizedAccountId
    ? localStorage.getItem(getThemeStorageKey(normalizedAccountId))
    : localStorage.getItem(LEGACY_THEME_STORAGE_KEY);

  if (isValidTheme(storedTheme)) {
    return storedTheme;
  }

  return 'light';
};

export const setStoredTheme = (theme: AppTheme, accountId?: string | null) => {
  const normalizedAccountId = normalizeAccountId(accountId);
  if (!normalizedAccountId) {
    return;
  }

  localStorage.setItem(getThemeStorageKey(normalizedAccountId), theme);
  localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
};

export const applyTheme = (theme: AppTheme, options?: { forceLight?: boolean }) => {
  const root = document.documentElement;

  if (options?.forceLight) {
    root.classList.remove('dark');
    return;
  }

  if (theme === 'dark') {
    root.classList.add('dark');
    return;
  }

  if (theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    return;
  }

  root.classList.remove('dark');
};

export const isLightOnlyThemePath = (pathname: string) => {
  return pathname === '/' || pathname === '/login';
};
