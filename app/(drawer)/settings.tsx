// app/(drawer)/settings.tsx
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Text,
  RadioButton,
  useTheme,
  List,
  Divider,
} from "react-native-paper";
import { useAppTheme, ThemeMode } from "../../components/theme/AppThemeProvider";

export default function SettingsScreen() {
  const paperTheme = useTheme();
  const { mode, effectiveMode, setMode } = useAppTheme();

  const onChange = (value: ThemeMode) => setMode(value);

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: paperTheme.colors.surface },
      ]}
    >
      <Text
        variant="titleLarge"
        style={[styles.title, { color: paperTheme.colors.onSurface }]}
      >
        Erscheinungsbild
      </Text>

      <View style={[styles.card, { backgroundColor: paperTheme.colors.surface }]}>
        <RadioButton.Group onValueChange={(v) => onChange(v as ThemeMode)} value={mode}>
          <List.Item
            title="System"
            description="Automatisch dem Gerätestil folgen"
            titleStyle={{ color: paperTheme.colors.onSurface }}
            descriptionStyle={{ color: paperTheme.colors.onSurfaceVariant }}
            left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
            right={() => <RadioButton value="system" />}
            onPress={() => onChange("system")}
          />
          <Divider />
          <List.Item
            title="Hell"
            description="Helles Erscheinungsbild verwenden"
            titleStyle={{ color: paperTheme.colors.onSurface }}
            descriptionStyle={{ color: paperTheme.colors.onSurfaceVariant }}
            left={(props) => <List.Icon {...props} icon="white-balance-sunny" />}
            right={() => <RadioButton value="light" />}
            onPress={() => onChange("light")}
          />
          <Divider />
          <List.Item
            title="Dunkel"
            description="Dunkles Erscheinungsbild verwenden"
            titleStyle={{ color: paperTheme.colors.onSurface }}
            descriptionStyle={{ color: paperTheme.colors.onSurfaceVariant }}
            left={(props) => <List.Icon {...props} icon="weather-night" />}
            right={() => <RadioButton value="dark" />}
            onPress={() => onChange("dark")}
          />
        </RadioButton.Group>
      </View>

      <Text
        variant="bodyMedium"
        style={{
          marginTop: 16,
          color: paperTheme.colors.onSurfaceVariant,
        }}
      >
        Aktiv: <Text style={{ fontWeight: "600" }}>{effectiveMode === "dark" ? "Dunkel" : "Hell"}</Text>
        {mode === "system" ? " (folgt System)" : ""}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    minHeight: "100%",
    gap: 12,
  },
  title: {
    marginBottom: 4,
  },
  card: {
    borderRadius: 12,
    overflow: "hidden",
  },
});
