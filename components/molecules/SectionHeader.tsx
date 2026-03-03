import React, { memo, useCallback, useRef } from 'react';
import { Pressable, StyleSheet, Animated } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { Text } from '@/components/atoms/Text';
import { colors, spacing } from '@/lib/theme';

type ColorScheme = 'light' | 'dark';

interface SectionHeaderProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  scheme?: ColorScheme;
}

export const SectionHeader = memo(function SectionHeader({
  title,
  isExpanded,
  onToggle,
  scheme = 'light',
}: SectionHeaderProps) {
  const theme = colors[scheme];
  const rotation = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;

  const handleToggle = useCallback(() => {
    Animated.timing(rotation, {
      toValue: isExpanded ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    onToggle();
  }, [isExpanded, onToggle, rotation]);

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <Pressable
      onPress={handleToggle}
      style={({ pressed }) => [
        styles.container,
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Text variant="bodySemiBold" scheme={scheme}>
        {title}
      </Text>
      <Animated.View style={{ transform: [{ rotate }] }}>
        <ChevronDown
          size={18}
          color={theme.text.secondary}
          strokeWidth={1.75}
        />
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
});
