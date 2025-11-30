/**
 * テーマユーティリティ
 * 
 * このファイルは、トークンを使用した正しい実装例を示しています。
 * tokens.json からトークンを読み込んで使用する方法を実装しています。
 */

// 実際の実装では、design-ai-linterやトークン管理ライブラリから
// トークンを読み込むことになりますが、ここでは例として直接定義しています

export const tokens = {
  color: {
    primary: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      500: '#0ea5e9',
      600: '#0284c7',
      700: '#0369a1',
      900: '#0c4a6e',
    },
    secondary: {
      500: '#8b5cf6',
      600: '#7c3aed',
    },
    neutral: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e5e5e5',
      500: '#737373',
      700: '#404040',
      900: '#171717',
    },
    semantic: {
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6',
    },
    brand: {
      primary: '#0ea5e9',
      accent: '#8b5cf6',
    },
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
  },
  typography: {
    fontSize: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '30px',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  borderRadius: {
    none: '0px',
    sm: '4px',
    md: '8px',
    lg: '12px',
    full: '9999px',
  },
} as const;

/**
 * トークンを使用したスタイルヘルパー関数
 */
export const getToken = (path: string): string => {
  const parts = path.split('.');
  let value: any = tokens;
  
  for (const part of parts) {
    value = value[part];
    if (value === undefined) {
      throw new Error(`Token not found: ${path}`);
    }
  }
  
  return String(value);
};

/**
 * カラートークンを取得
 */
export const getColor = (path: string): string => {
  return getToken(`color.${path}`);
};

/**
 * スペーシングトークンを取得
 */
export const getSpacing = (size: keyof typeof tokens.spacing): string => {
  return tokens.spacing[size];
};

/**
 * タイポグラフィトークンを取得
 */
export const getTypography = {
  fontSize: (size: keyof typeof tokens.typography.fontSize): string => {
    return tokens.typography.fontSize[size];
  },
  fontWeight: (weight: keyof typeof tokens.typography.fontWeight): number => {
    return tokens.typography.fontWeight[weight];
  },
  lineHeight: (height: keyof typeof tokens.typography.lineHeight): number => {
    return tokens.typography.lineHeight[height];
  },
};

