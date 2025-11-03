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
import { addPersonalSpend } from "../../data/spend";
import { useRouter } from "expo-router";

export default function AddPersonalSpend() {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [note, setNote] = useState("");
  const router = useRouter();

  async function onSave() {
    const val = Number(amount);
    if (!amount || isNaN(val) || val <= 0) {
      Alert.alert("Invalid amount", "Enter a positive number.");
      return;
    }
    await addPersonalSpend(val, category, note || undefined);
    router.back();
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="light" />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Personal Spend</Text>
        <TextInput
          placeholder="Amount (e.g. 12.50)"
          placeholderTextColor="#6B7280"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
          style={styles.input}
        />
        <TextInput
          placeholder="Category (Food / Fun)"
          placeholderTextColor="#6B7280"
          value={category}
          onChangeText={setCategory}
          style={styles.input}
        />
        <TextInput
          placeholder="Note (optional)"
          placeholderTextColor="#6B7280"
          value={note}
          onChangeText={setNote}
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
    color: "#E5E7EB",
    marginBottom: 16,
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
