import * as React from "react";
import { Platform, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Drawer } from "expo-router/drawer";
import { DrawerActions } from "@react-navigation/native";
import type { DrawerContentComponentProps } from "@react-navigation/drawer";

import { ThemeProviderWrapper } from "../theme";
import {
  useTheme,
  Appbar,
  Drawer as PaperDrawer,
  Icon,
} from "react-native-paper";
import { Slot } from "expo-router";

// ---------- Constants ----------
const APPBAR_HEIGHT = Platform.OS === "ios" ? 64 : 56;

// ---------- Custom Header rendered with React Native Paper ----------
function PaperHeader({ navigation, route, options }: any) {
  const theme = useTheme();
  const title =
    options.headerTitle ??
    options.title ??
    (typeof route?.name === "string" ? route.name : "Suni");

  return (
    <Appbar.Header
      mode="center-aligned"
      elevated
      style={{
        backgroundColor: theme.colors.elevation.level2,
      }}
    >
      <Appbar.Action
        icon={(props) => <Icon source="menu" size={props.size} color={props.color} />}
        onPress={() =>
          navigation?.toggleDrawer
            ? navigation.toggleDrawer()
            : navigation?.dispatch?.(DrawerActions.toggleDrawer())
        }
        accessibilityLabel="Open navigation menu"
      />
      <Appbar.Content title={title} />
    </Appbar.Header>
  );
}

// ---------- Custom Drawer Content rendered with React Native Paper ----------
function ThemedDrawerContent(props: DrawerContentComponentProps) {
  const { state, descriptors, navigation } = props;
  const theme = useTheme();

  const HIDDEN = new Set<string>();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: APPBAR_HEIGHT }}>
      <PaperDrawer.Section>
        {state.routes
          .filter((r) => !HIDDEN.has(r.name))
          .map((route, index) => {
            const options = descriptors[route.key]?.options ?? {};
            const label =
              options.drawerLabel ??
              options.title ??
              (typeof route.name === "string" ? route.name : "Item");

            const IconComp =
              options.drawerIcon ??
              (({ color, size }: { color: string; size: number }) => (
                <Icon source="dots-horizontal" color={color} size={size} />
              ));

            return (
              <PaperDrawer.Item
                key={route.key}
                label={label as string}
                icon={({ color, size }) => <IconComp color={color} size={size} />}
                active={state.index === index}
                onPress={() => navigation.navigate(route.name as never)}
              />
            );
          })}
      </PaperDrawer.Section>
    </View>
  );
}


// ---------- Root Layout ----------
export default function RootLayout() {
  const theme = useTheme();

  return (
    <ThemeProviderWrapper>
      <StatusBar style={theme.dark ? "light" : "dark"} />
      <Drawer
        screenOptions={{
          header: (props) => <PaperHeader {...props} />,
        }}
        drawerContent={(props) => <ThemedDrawerContent {...props} />}
      >
        <Drawer.Screen
          name="(tabs)"
          options={{
            title: "Home",
            drawerIcon: ({ color, size }) => (
              <Icon source="home-outline" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="profile"
          options={{
            title: "Profil",
            drawerIcon: ({ color, size }) => (
              <Icon source="account-outline" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="todos"
          options={{
            title: "Todos",
            drawerIcon: ({ color, size }) => (
              <Icon source="format-list-bulleted" size={size} color={color} />
            ),
          }}
        />        
        <Slot />
      </Drawer>
    </ThemeProviderWrapper>
  );
}
