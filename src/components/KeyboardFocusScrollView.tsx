import {
  KeyboardFocusScrollContext,
  useKeyboardFocusScroll,
} from '@/hooks/useKeyboardFocusScroll';
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

interface KeyboardFocusScrollViewProps extends Omit<ScrollViewProps, 'ref'> {
  children: React.ReactNode;
  stickyBottomHeight?: number;
  breathingRoom?: number;
  basePaddingBottom?: number;
  containerStyle?: StyleProp<ViewStyle>;
}

export function KeyboardFocusScrollView({
  children,
  stickyBottomHeight = 0,
  breathingRoom = 32,
  basePaddingBottom = 24,
  containerStyle,
  contentContainerStyle,
  onScroll: externalOnScroll,
  ...rest
}: KeyboardFocusScrollViewProps) {
  const controller = useKeyboardFocusScroll({
    stickyBottomHeight,
    breathingRoom,
  });

  return (
    <KeyboardFocusScrollContext.Provider value={controller}>
      <KeyboardAvoidingView
        style={[styles.flex, containerStyle]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          {...rest}
          ref={controller.scrollViewRef}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(e) => {
            controller.onScroll(e);
            externalOnScroll?.(e);
          }}
          contentContainerStyle={[
            contentContainerStyle,
            {
              paddingBottom: basePaddingBottom + stickyBottomHeight,
            },
          ]}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </KeyboardFocusScrollContext.Provider>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
