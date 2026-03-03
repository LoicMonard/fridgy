import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { colors, radius, spacing } from '@/lib/theme';

type ColorScheme = 'light' | 'dark';

interface IconButtonProps {
  icon: LucideIcon;
  active?: boolean;
  onPress?: () => void;
  size?: number;
  scheme?: ColorScheme;
  style?: ViewStyle;
}

export function IconButton({
  icon: Icon,
  active = false,
  onPress,
  size = 20,
  scheme = 'light',
  style,
}: IconButtonProps) {
  const { activeBg, activeColor, inactiveBg, inactiveColor } = colors[scheme].iconButton;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: active ? activeBg : inactiveBg,
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      <Icon
        size={size}
        color={active ? activeColor : inactiveColor}
        strokeWidth={1.75}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
});
