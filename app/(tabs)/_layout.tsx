// app/(tabs)/_layout.tsx
import * as React from "react";
import {Ionicons} from "@expo/vector-icons";
import {createMaterialTopTabNavigator} from "@react-navigation/material-top-tabs";
import {withLayoutContext} from "expo-router";
import {UniversityProvider} from "../../components/university/UniversityContext";
import {useTheme} from "react-native-paper";
import {StyleSheet} from "react-native";

const {Navigator} = createMaterialTopTabNavigator();
export const MaterialTopTabs = withLayoutContext(Navigator);

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
    news: "newspaper-outline",
    uni: "school-outline",
    timetable: "calendar-outline",
    chat: "chatbubbles-outline",
};

export default function TabLayout() {
    // Use the Paper theme — this is the *same* theme provided in app/_layout via AppThemeProvider
    const theme = useTheme();

    return (
        <UniversityProvider>
            <MaterialTopTabs
                tabBarPosition="bottom"
                screenOptions={({route}) => ({
                    swipeEnabled: true,
                    tabBarShowLabel: false,
                    // If you want no indicator, keep height 0; otherwise use theme.colors.primary
                    tabBarIndicatorStyle: {height: 0}, // or: { height: 2, backgroundColor: theme.colors.primary }
                    tabBarActiveTintColor: theme.colors.primary,
                    tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
                    tabBarStyle: {
                        backgroundColor: theme.colors.surface,
                        borderTopColor: theme.colors.outlineVariant,
                        borderTopWidth: StyleSheet.hairlineWidth,
                        height: 90,
                        paddingBottom: 10,
                        paddingTop: 5,
                    },
                    tabBarIcon: ({color}) => (
                        <Ionicons
                            name={ICONS[route.name] ?? "ellipse-outline"}
                            size={28}
                            color={color}
                        />
                    ),
                })}
            >
                <MaterialTopTabs.Screen name="news" options={{title: "News"}}/>
                <MaterialTopTabs.Screen name="uni" options={{title: "Uni"}}/>
                <MaterialTopTabs.Screen name="timetable" options={{title: "Kalender"}}/>
                <MaterialTopTabs.Screen name="chat" options={{title: "Chat"}}/>
            </MaterialTopTabs>
        </UniversityProvider>
    );
}
