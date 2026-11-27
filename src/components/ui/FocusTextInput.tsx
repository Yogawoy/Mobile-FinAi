import { useKeyboardFocusScrollContext } from '@/hooks/useKeyboardFocusScroll';
import React, { forwardRef, useState, type ComponentRef } from 'react';
import {
  TextInput,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
} from 'react-native';

interface FocusTextInputProps extends TextInputProps {
  focusBorderColor?: string;
  showFocusBorder?: boolean;
  focusStyle?: StyleProp<TextStyle>;
}

type FocusEventArg = Parameters<NonNullable<TextInputProps['onFocus']>>[0];
type BlurEventArg = Parameters<NonNullable<TextInputProps['onBlur']>>[0];

export const FocusTextInput = forwardRef<
  ComponentRef<typeof TextInput>,
  FocusTextInputProps
>(function FocusTextInput(
  {
    focusBorderColor = '#2563EB',
    showFocusBorder = true,
    focusStyle,
    style,
    onFocus,
    onBlur,
    ...rest
  },
  ref
) {
  const kbFocus = useKeyboardFocusScrollContext();
  const [focused, setFocused] = useState(false);

  const handleFocus = (e: FocusEventArg) => {
    setFocused(true);
    kbFocus?.scrollToInput(e);
    onFocus?.(e);
  };

  const handleBlur = (e: BlurEventArg) => {
    setFocused(false);
    onBlur?.(e);
  };

    return (
      <TextInput
        {...rest}
        ref={ref}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={[
          style,
          focused && showFocusBorder && { borderColor: focusBorderColor },
          focused && focusStyle,
        ]}
      />
    );
  }
);
