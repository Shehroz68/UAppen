import React, { createContext, useContext, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  colors: {
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    primary: string;
    headerBackground: string;
    headerText: string;
  };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>('light');

  const toggleTheme = () => {
    setTheme((prev) => {
      const newTheme = prev === 'light' ? 'dark' : 'light';
      console.log('🎨 Theme toggled:', prev, '→', newTheme);
      return newTheme;
    });
  };

  const colors = theme === 'light' 
    ? {
        background: '#FFFFFF',
        surface: '#F5F5F5',
        text: '#000000',
        textSecondary: '#666666',
        border: '#E0E0E0',
        primary: '#881C1C',
        headerBackground: '#881C1C',  // UMass maroon for light mode
        headerText: '#FFFFFF',
      }
    : {
        background: '#323F4F',
        surface: '#C4C9D0',  // Medium-light grey for cards (clearly visible as grey)
        text: '#1F2937',     // Dark grey text for light cards
        textSecondary: '#4B5563',  // Darker grey for better contrast on medium-light cards
        border: '#9CA3AF',
        primary: '#881C1C',
        headerBackground: '#1F2937',  // Dark grey for dark mode navbar
        headerText: '#F9FAFB',  // Light grey text for dark mode
      };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

