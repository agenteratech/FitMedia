import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetScrollView,
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { colors, radius, shadows } from '@/theme';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  /** Explicit snap points e.g. ['50%', '90%']. Omit to auto-size to content height. */
  snapPoints?: (string | number)[];
  children: React.ReactNode;
  /**
   * When true, the sheet body is a BottomSheetScrollView so vertical scroll
   * and any nested horizontal ScrollViews work correctly on native.
   * Pass scrollContentStyle to style the inner content container.
   */
  scrollable?: boolean;
  scrollContentStyle?: StyleProp<ViewStyle>;
}

/**
 * Sheet — gesture-driven bottom sheet built on @gorhom/bottom-sheet v5.
 * - Drag handle built in
 * - Drag down or tap backdrop to dismiss
 * - Spring physics for open/close
 * - Keyboard-interactive: sheet moves up with keyboard
 * Requires BottomSheetModalProvider at the app root.
 */
export function Sheet({ visible, onClose, snapPoints, children, scrollable, scrollContentStyle }: SheetProps) {
  const ref = useRef<BottomSheetModal>(null);
  const useDynamic = snapPoints == null;

  useEffect(() => {
    if (visible) {
      ref.current?.present();
    } else {
      ref.current?.dismiss();
    }
  }, [visible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  return (
    <BottomSheetModal
      ref={ref}
      {...(useDynamic
        ? { enableDynamicSizing: true }
        : { snapPoints, enableDynamicSizing: false })}
      enablePanDownToClose
      onDismiss={onClose}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={styles.handle}
      backgroundStyle={styles.background}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      animateOnMount
    >
      {scrollable ? (
        <BottomSheetScrollView
          style={styles.fill}
          contentContainerStyle={scrollContentStyle}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </BottomSheetScrollView>
      ) : (
        <BottomSheetView style={useDynamic ? undefined : styles.fill}>
          {children}
        </BottomSheetView>
      )}
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    ...shadows.sheet,
  } satisfies ViewStyle,
  handle: {
    backgroundColor: colors.ink4,
    width: 36,
    height: 4,
    borderRadius: radius.pill,
  },
  fill: {
    flex: 1,
  } satisfies ViewStyle,
});
