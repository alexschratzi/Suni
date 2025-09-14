// app/_layout.tsx
import { Drawer } from "expo-router/drawer";
import { DrawerToggleButton, DrawerContentScrollView, DrawerItemList } from "@react-navigation/drawer";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { logout } from "../utils/logout";
import { Pressable, Text } from "react-native";

export default function RootLayout(props: any) {
  const router = useRouter();

  return (
    <Drawer
      screenOptions={{
        headerTitle: "Suni",
        headerLeft: () => <DrawerToggleButton tintColor="gray" />,
      }}
      drawerContent={(drawerProps) => (
        <DrawerContentScrollView {...drawerProps}>
          {/* Alle Standard-Screens */}
          <DrawerItemList {...drawerProps} />

          {/* Logout Button */}
          <Pressable
            onPress={async () => {
              await logout();       // Firebase signOut()
              router.push("/");     // ⬅️ Zurück zum Login (app/index.tsx)
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 15,
            }}
          >
            <Ionicons name="log-out-outline" size={22} color="black" />
            <Text style={{ marginLeft: 10, fontSize: 16 }}>Logout</Text>
          </Pressable>
        </DrawerContentScrollView>
      )}
    >
      <Drawer.Screen
        name="(tabs)"
        options={{
          title: "Home",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="profile"
        options={{
          title: "Profil",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="todos"
        options={{
          title: "Todos",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="list-outline" size={size} color={color} />
          ),
        }}
      />
    </Drawer>
  );
}
