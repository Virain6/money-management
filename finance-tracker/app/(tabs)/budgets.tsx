import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect } from "@react-navigation/native";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import {
  createRecurringBudget,
  deleteBudget,
  listBudgetsByMonth,
  budgetUsages,
  ensureRecurringBudgets,
  type BudgetRow,
} from "../../data/budgets";
import { useRouter } from "expo-router";

function getYYYYMM(d = new Date()) {
  return d.getFullYear() * 100 + (d.getMonth() + 1);
}

export default function BudgetsScreen() {
  const router = useRouter();
  const [yyyymm, setYyyymm] = useState(getYYYYMM());
  const [rows, setRows] = useState<BudgetRow[]>([]);
  const [usageMap, setUsageMap] = useState<Map<string | null, number>>(
    new Map()
  );
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");

  async function load() {
    await ensureRecurringBudgets(yyyymm);
    const b = await listBudgetsByMonth(yyyymm);
    setRows(b);
    const usage = await budgetUsages(yyyymm);
    setUsageMap(new Map(usage.map((u) => [u.budget_id, u.total])));
  }

  useEffect(() => {
    load();
  }, [yyyymm]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [yyyymm])
  );

  const onAdd = async () => {
    const val = Number(amount);
    if (!name.trim() || isNaN(val) || val < 0) {
      Alert.alert("Invalid", "Enter a name and non-negative amount.");
      return;
    }
    await createRecurringBudget(name.trim(), val);
    setName("");
    setAmount("");
    await load();
  };

  const renderRightActions = (item: BudgetRow) => (
    <View style={{ justifyContent: "center", alignItems: "flex-end" }}>
      <Pressable
        onPress={() =>
          Alert.alert(
            "Delete budget?",
            `Remove "${item.name}" for ${item.month}?`,
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                  await deleteBudget(item.id);
                  await load();
                },
              },
            ]
          )
        }
        style={{
          backgroundColor: "#EF4444",
          borderRadius: 12,
          paddingVertical: 12,
          paddingHorizontal: 16,
          marginLeft: 8,
          minWidth: 88,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: "white", fontWeight: "700" }}>Delete</Text>
      </Pressable>
    </View>
  );

  const autoDelete = async (item: BudgetRow) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    await deleteBudget(item.id);
    await load();
  };

  return (
    <SafeAreaView style={styles.sa} edges={["top"]}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.titleRow}>
          <Ionicons name="pricetags-outline" color="#E5E7EB" size={26} />
          <Text style={styles.title}>Budgets</Text>
        </View>

        {/* Add form */}
        <View style={styles.formRow}>
          <TextInput
            placeholder="Name (e.g. Food)"
            placeholderTextColor="#6B7280"
            value={name}
            onChangeText={setName}
            style={[styles.input, { flex: 1 }]}
          />
          <TextInput
            placeholder="Amount"
            placeholderTextColor="#6B7280"
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
            style={[styles.input, { width: 120 }]}
          />
          <Pressable style={styles.btn} onPress={onAdd}>
            <Text style={styles.btnText}>Add</Text>
          </Pressable>
        </View>

        <FlatList
          data={rows}
          keyExtractor={(i) => i.id}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => {
            const spent = usageMap.get(item.id) ?? 0;
            return (
              <Swipeable
                renderRightActions={() => renderRightActions(item)}
                overshootRight={false}
                rightThreshold={96}
                friction={2}
                onSwipeableOpen={(dir) => {
                  if (dir === "left") autoDelete(item);
                }}
              >
                <Pressable
                  onPress={() => router.push(`/edit/budget/${item.id}`)}
                >
                  <View style={styles.card}>
                    <View>
                      <Text style={styles.cardTop}>{item.name}</Text>
                      <Text style={styles.cardSub}>
                        ${spent.toFixed(2)} / ${item.amount.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              </Swipeable>
            );
          }}
          ListEmptyComponent={
            <Text style={{ color: "#94A3B8" }}>No budgets this month.</Text>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sa: { flex: 1, backgroundColor: "#0B0F14" },
  container: { flex: 1, paddingHorizontal: 16, paddingBottom: 12 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  title: { fontSize: 24, fontWeight: "700", color: "#E5E7EB" },
  formRow: {
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
  },
  btn: {
    backgroundColor: "#2F6FED",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  btnText: { color: "white", fontWeight: "700" },
  card: {
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardTop: { color: "#E5E7EB", fontWeight: "700" },
  cardSub: { color: "#9CA3AF", marginTop: 2 },
});
