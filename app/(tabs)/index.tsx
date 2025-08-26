import { Redirect } from "expo-router";

export default function Index() {
  // beim Start automatisch zum ersten Tab weiterleiten
  return <Redirect href="/news" />;
}
