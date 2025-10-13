import React, { useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { Provider as PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ThemeContext = React.createContext({
  userTheme: 'system' as 'light' | 'dark' | 'system',
  setUserTheme: (t: 'light' | 'dark' | 'system') => {},
});

const customLightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    // primary: '#007aff',
  },
};

const customDarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    // primary: '#0a84ff',
  },
};

export const ThemeProviderWrapper = ({ children }: { children: React.ReactNode }) => {
  const systemScheme = useColorScheme();
  const [userTheme, setUserTheme] = useState<'light' | 'dark' | 'system'>('system');

  useEffect(() => {
    AsyncStorage.getItem('theme').then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setUserTheme(stored);
      }
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('theme', userTheme);
  }, [userTheme]);

  const effectiveTheme =
    userTheme === 'system'
      ? systemScheme === 'dark'
        ? customDarkTheme
        : customLightTheme
      : userTheme === 'dark'
      ? customDarkTheme
      : customLightTheme;

  return (
    <ThemeContext.Provider value={{ userTheme, setUserTheme }}>
      <PaperProvider theme={effectiveTheme}>{children}</PaperProvider>
    </ThemeContext.Provider>
  );
};


