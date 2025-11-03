import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function AddHub() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.sa} edges={["top"]}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.titleRow}>
          <Ionicons name="add-circle-outline" color="#E5E7EB" size={30} />
          <Text style={styles.title}>Add</Text>
        </View>

        <Pressable
          style={styles.card}
          onPress={() => router.push("/add/person")}
        >
          <View style={styles.row}>
            <Ionicons name="person-add-outline" size={20} color="#E5E7EB" />
            <Text style={styles.cardTitle}>Person</Text>
          </View>
          <Text style={styles.cardSub}>Name & email</Text>
        </Pressable>

        <Pressable
          style={styles.card}
          onPress={() => router.push("/add/shared-expense")}
        >
          <View style={styles.row}>
            <Ionicons name="people-outline" size={20} color="#E5E7EB" />
            <Text style={styles.cardTitle}>Shared Expense</Text>
          </View>
          <Text style={styles.cardSub}>Split equally first</Text>
        </Pressable>

        <Pressable
          style={styles.card}
          onPress={() => router.push("/add/personal-spend")}
        >
          <View style={styles.row}>
            <Ionicons name="wallet-outline" size={20} color="#E5E7EB" />
            <Text style={styles.cardTitle}>Personal Spend</Text>
          </View>
          <Text style={styles.cardSub}>Category totals</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sa: { flex: 1, backgroundColor: "#0B0F14" },
  container: { flex: 1, paddingHorizontal: 16, paddingBottom: 12 },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#E5E7EB",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  card: {
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  cardTitle: { color: "#E5E7EB", fontSize: 16, fontWeight: "700" },
  cardSub: { color: "#9CA3AF", marginTop: 4 },
});
