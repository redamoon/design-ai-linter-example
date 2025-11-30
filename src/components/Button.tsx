import React from 'react';

interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
}

/**
 * Buttonコンポーネント
 * 
 * このコンポーネントには、リントで検出されるべき生の値が含まれています：
 * - カラー値: #0ea5e9, #0284c7, #8b5cf6
 * - ピクセル値: 8px, 12px, 16px, 24px
 * - フォントサイズ: 14px, 16px, 18px
 * 
 * これらは tokens.json のトークンに置き換えるべきです。
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  onClick,
}) => {
  const baseStyle: React.CSSProperties = {
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontWeight: 500,
    transition: 'all 0.2s',
    marginTop: '10px', // 警告: 生の値 10px を使用
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: '#0ea5e9',
      color: '#ffffff',
    },
    secondary: {
      backgroundColor: '#8b5cf6',
      color: '#ffffff',
    },
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: {
      padding: '8px 12px',
      fontSize: '14px',
    },
    md: {
      padding: '12px 16px',
      fontSize: '16px',
    },
    lg: {
      padding: '16px 24px',
      fontSize: '18px',
    },
  };

  const hoverStyle: React.CSSProperties = {
    ...(variant === 'primary' && {
      backgroundColor: '#0284c7',
    }),
    ...(variant === 'secondary' && {
      backgroundColor: '#7c3aed',
    }),
  };

  return (
    <button
      style={{
        ...baseStyle,
        ...variantStyles[variant],
        ...sizeStyles[size],
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        Object.assign(e.currentTarget.style, hoverStyle);
      }}
      onMouseLeave={(e) => {
        Object.assign(e.currentTarget.style, variantStyles[variant]);
      }}
    >
      {children}
    </button>
  );
};

