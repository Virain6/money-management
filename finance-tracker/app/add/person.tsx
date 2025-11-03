import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { addPerson } from "../../data/people";
import { useRouter } from "expo-router";
import Octicons from "@expo/vector-icons/Octicons";

export default function AddPersonScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const router = useRouter();

  async function onSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert("Name required", "Please enter a name.");
      return;
    }
    await addPerson(trimmed, email || undefined);
    router.back();
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <StatusBar style="light" />
      <View>
        <View style={styles.titleRow}>
          <Octicons name="person-add" color="#F59E0B" size={30} />
          <Text style={styles.title}>Add Person</Text>
        </View>

        <TextInput
          placeholder="Name"
          placeholderTextColor="#6B7280"
          value={name}
          onChangeText={setName}
          style={styles.input}
        />
        <TextInput
          placeholder="Email (optional)"
          placeholderTextColor="#6B7280"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          style={styles.input}
        />

        <Pressable style={styles.btn} onPress={onSave}>
          <Text style={styles.btnText}>Save</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#0B0F14" },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#F59E0B",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  input: {
    backgroundColor: "#111827",
    color: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  btn: {
    backgroundColor: "#2F6FED",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 6,
  },
  btnText: { color: "white", fontWeight: "700" },
});
