import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 10,
  },
  originalCard: {
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 12,
    marginBottom: 12,
  },
  sortRow: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  sortAnchor: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  sortText: {
    fontSize: 13,
    fontWeight: "600",
  },
  messageRow: {
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "flex-end",
    width: "100%",
  },
  threadRow: {
    marginBottom: 10,
    paddingHorizontal: 4,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  voteColumn: {
    width: 34,
    alignItems: "center",
    marginLeft: 6,
    paddingTop: 6,
  },
  voteButton: {
    paddingVertical: 2,
  },
  voteScore: {
    fontSize: 12,
    fontWeight: "600",
    marginVertical: 2,
  },
  rowMine: {
    justifyContent: "flex-end",
  },
  rowOther: {
    justifyContent: "flex-start",
  },
  threadCard: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  metaLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  metaUser: {
    fontSize: 12,
    marginLeft: 6,
    flexShrink: 1,
  },
  metaTime: {
    fontSize: 12,
  },
  bubbleWrap: {
    position: "relative",
    flexShrink: 1,
    maxWidth: "90%",
  },
  bubble: {
    maxWidth: "100%",
    minWidth: 56,
    paddingTop: 8,
    paddingBottom: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexShrink: 1,
  },
  bubbleShadow: {
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 1.5,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  bubbleMine: {
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    borderBottomLeftRadius: 4,
  },
  bubbleNoTailMine: {
    borderBottomRightRadius: 10,
  },
  bubbleNoTailOther: {
    borderBottomLeftRadius: 10,
  },
  bubbleTail: {
    position: "absolute",
    bottom: 6,
    width: 10,
    height: 10,
    borderRadius: 2,
    transform: [{ rotate: "45deg" }],
  },
  bubbleTailMine: {
    right: -4,
  },
  bubbleTailOther: {
    left: -4,
  },
  dateSeparator: {
    alignSelf: "center",
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  dateSeparatorText: {
    fontSize: 12,
    fontWeight: "600",
  },
  msgText: {
    fontSize: 16,
    lineHeight: 20,
  },
  dmText: {
    fontSize: 16,
    lineHeight: 22,
  },
  attachmentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  attachmentText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
  },
  timeRow: {
    alignSelf: "flex-end",
    marginTop: 4,
    minWidth: 40,
  },
  timeText: {
    fontSize: 11,
    textAlign: "right",
  },
  dmListContent: {
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 12,
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  searchWrap: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  searchClose: {
    padding: 4,
  },
  threadListContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
});
