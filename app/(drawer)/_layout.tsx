// app/(drawer)/_layout.tsx
import React, { useEffect, useState } from "react";
import { Drawer } from "expo-router/drawer";
import { useRouter } from "expo-router";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { auth } from "../../firebase";
import { DrawerToggleButton } from "@react-navigation/drawer";
import { Pressable, Text } from "react-native";

export default function DrawerLayout() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setReady(true);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/(auth)");
  }, [ready, user, router]);

  if (!ready || !user) return null;

  return (
    <Drawer
      screenOptions={{
        headerShown: true, // <- Header vom Drawer aktiv
      }}
    >
      {/* Home = deine Tabs => Header mit Hamburger links + Logout rechts */}
      <Drawer.Screen
        name="(tabs)"
        options={{
          title: "Suni",
          headerLeft: (props) => <DrawerToggleButton {...props} />,
          headerRight: () => (
            <Pressable
              onPress={() => signOut(auth).then(() => router.replace("/(auth)"))}
              style={{ paddingHorizontal: 12 }}
            >
              <Text>Logout</Text>
            </Pressable>
          ),
        }}
      />

      {/* Profil im Seitenmenü, ebenfalls mit Hamburger */}
      <Drawer.Screen
        name="profile"
        options={{
          title: "Profil",
          headerLeft: (props) => <DrawerToggleButton {...props} />,
        }}
      />
    </Drawer>
  );
}
