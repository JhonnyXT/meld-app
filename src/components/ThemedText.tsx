import React from 'react';
import { Text, type TextProps } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

interface ThemedTextProps extends TextProps {
  variant?: 'headline' | 'title' | 'bodyLg' | 'body' | 'caption';
  dim?: boolean;
}

export function ThemedText({ variant = 'body', dim = false, style, ...rest }: ThemedTextProps) {
  const { palette, type } = useTheme();
  return (
    <Text
      style={[
        {
          color: dim ? palette.textDim : palette.text,
          fontSize: type[variant],
          fontWeight: variant === 'headline' || variant === 'title' ? '700' : '400',
        },
        style,
      ]}
      {...rest}
    />
  );
}
