import { StyleSheet } from "react-native";
import { Calendar } from 'react-native-calendars';

export default function TimetableScreen() {
  return (
      <Calendar
    onDayPress={day => {
      console.log('selected day', day);
    }}
      />  
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  heading: { fontSize: 24, fontWeight: "bold", marginBottom: 10 },
});
