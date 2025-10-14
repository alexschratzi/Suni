// components/ui/Header.tsx
import * as React from "react";
import { StyleSheet } from "react-native";
import { Appbar } from "react-native-paper";
import type { IconSource } from "react-native-paper/lib/typescript/components/Icon";

type HeaderProps = {
  title: string;
  canGoBack?: boolean;
  onBack?: () => void;

  /** Optional: right-side icon (e.g. "backup-restore"). */
  rightIcon?: IconSource;
  /** Optional: press handler for the right icon. */
  onRightPress?: () => void;
  /** Optional: disable the right icon. */
  rightDisabled?: boolean;
  /** Optional: a custom right renderer (overrides rightIcon). */
  renderRight?: () => React.ReactNode;

  /** Optional: accessibility label for right icon. */
  rightAccessibilityLabel?: string;
};

export default function Header({
  title,
  canGoBack,
  onBack,
  rightIcon,
  onRightPress,
  rightDisabled,
  renderRight,
  rightAccessibilityLabel = "Aktion",
}: HeaderProps) {
  return (
    <Appbar.Header
      mode="small"
      elevated={false}
      statusBarHeight={0}
      style={styles.header}
      theme={{ colors: { surface: "transparent" } }}
    >
      {canGoBack ? <Appbar.BackAction onPress={onBack} /> : null}
      <Appbar.Content title={title} />
      {renderRight
        ? renderRight()
        : rightIcon
        ? (
          <Appbar.Action
            icon={rightIcon}
            onPress={onRightPress}
            disabled={rightDisabled}
            accessibilityLabel={rightAccessibilityLabel}
            testID="header-right-action"
          />
        )
        : null}
    </Appbar.Header>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: 0,
    paddingTop: 0,
    elevation: 0,
    shadowColor: "transparent",
    borderBottomWidth: 0,
    backgroundColor: "transparent",
  },
});
