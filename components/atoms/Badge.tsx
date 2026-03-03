import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { colors, radius, spacing, EXPIRY_BADGE_THRESHOLD_DAYS } from '@/lib/theme';

type ColorScheme = 'light' | 'dark';

interface BadgeProps {
  daysLeft: number;
  scheme?: ColorScheme;
}

function getExpiryLevel(daysLeft: number): 'urgent' | 'warning' | 'safe' {
  if (daysLeft <= 1) return 'urgent';
  if (daysLeft <= 7) return 'warning';
  return 'safe';
}

export function Badge({ daysLeft, scheme = 'light' }: BadgeProps) {
  if (daysLeft > EXPIRY_BADGE_THRESHOLD_DAYS) return null;

  const level = getExpiryLevel(daysLeft);
  const { text: textColor, bg } = colors[scheme].expiry[level];

  const label = daysLeft <= 0 ? 'Exp.' : `${daysLeft}J`;

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Text
        variant="quantity"
        color={textColor}
        style={styles.text}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 10,
    lineHeight: 14,
  },
});
