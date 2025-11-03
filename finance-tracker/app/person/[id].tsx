import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { listRecentExpensesForPerson } from "../../data/expenses";
import Octicons from "@expo/vector-icons/Octicons";

export default function PersonDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const r = await listRecentExpensesForPerson(id);
      setRows(r);
    })();
  }, [id]);

  return (
    <SafeAreaView style={styles.sa} edges={["top"]}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.titleRow}>
          <Octicons name="arrow-switch" color="#E5E7EB" size={30} />
          <Text style={styles.title}>Transactions</Text>
        </View>
        <FlatList
          data={rows}
          keyExtractor={(i) => i.id}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.line}>
                {item.description ?? "(No description)"}
              </Text>
              <Text style={styles.lineSmall}>
                Total ${item.amount?.toFixed(2) ?? "0.00"} •{" "}
                {item.person_name ?? "Person"}'s share $
                {item.my_share?.toFixed(2) ?? "0.00"}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <Text style={{ color: "#94A3B8" }}>No recent items.</Text>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sa: { flex: 1, backgroundColor: "#0B0F14" },
  container: { flex: 1, padding: 16, backgroundColor: "#0B0F14" },
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
  card: {
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 12,
  },
  line: { color: "#E5E7EB", fontWeight: "600" },
  lineSmall: { color: "#9CA3AF", marginTop: 4 },
});
