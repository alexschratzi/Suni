import type { StyleProp, TextStyle } from "react-native";
import type { TextScale } from "@/components/theme/AppThemeProvider";

export type LanguageCode = "de" | "en";

export type ListItemTextStyles = {
  titleStyle?: StyleProp<TextStyle>;
  descriptionStyle?: StyleProp<TextStyle>;
};

export type EventCategories = {
  uniParties: boolean;
  uniEvents: boolean;
  cityEvents: boolean;
};

export type HiddenThread = {
  id: string;
  otherUid: string;
  last?: string | null;
  lastTimestamp?: string | null;
};

export type SaveNotifications = (next: {
  global?: boolean;
  chat?: boolean;
  mention?: boolean;
  direct?: boolean;
  rooms?: boolean;
  color?: string | null;
  eventsEnabled?: boolean;
  categories?: Partial<EventCategories>;
  textScale?: TextScale;
}) => void | Promise<void>;
