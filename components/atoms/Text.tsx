import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { fontFamily, fontSize, colors } from '@/lib/theme';

type Variant = 'h1' | 'h2' | 'h3' | 'body' | 'bodyMedium' | 'bodySemiBold' | 'label' | 'quantity';
type ColorScheme = 'light' | 'dark';

interface TextProps extends RNTextProps {
  variant?: Variant;
  color?: string;
  scheme?: ColorScheme;
}

export function Text({ variant = 'body', color, scheme = 'light', style, ...props }: TextProps) {
  return (
    <RNText
      style={[
        styles.base,
        styles[variant],
        { color: color ?? colors[scheme].text.primary },
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.md,
  },
  h1: {
    fontFamily: fontFamily.bodyBold,
    fontSize: fontSize.xxxl,
  },
  h2: {
    fontFamily: fontFamily.bodyBold,
    fontSize: fontSize.xxl,
  },
  h3: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: fontSize.xl,
  },
  body: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.md,
  },
  bodyMedium: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.md,
  },
  bodySemiBold: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: fontSize.md,
  },
  label: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.sm,
  },
  quantity: {
    fontFamily: fontFamily.quantity,
    fontSize: fontSize.sm,
  },
});
