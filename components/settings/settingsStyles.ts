import { StyleSheet } from "react-native";

export const settingsStyles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  subheader: {
    marginBottom: 4,
  },
  card: {
    borderRadius: 14,
    padding: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
  },
  inlineMenu: {
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: "transparent",
    paddingHorizontal: 16,
  },
  inlineBtn: {
    justifyContent: "flex-start",
  },
  todo: {
    color: "#d97706",
    fontWeight: "600",
    fontSize: 12,
  },
});
