// app/logout.tsx
import { View, Text } from "react-native";

export default function LogoutScreen() {
  // Diese Seite sollte nie angezeigt werden,
  // weil wir den DrawerItemPress abfangen
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Logging out...</Text>
    </View>
  );
}
