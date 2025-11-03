// app/(tabs)/spending.tsx
import React, { useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable"; // Reanimated version
import type { PersonalSpendRow } from "../../types/db";
import {
  listPersonalSpendByMonth,
  deletePersonalSpend,
} from "../../data/spend";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";

function getYYYYMM(d = new Date()) {
  return d.getFullYear() * 100 + (d.getMonth() + 1);
}

export default function SpendingScreen() {
  const [yyyymm, setYyyymm] = useState<number>(getYYYYMM());
  const [rows, setRows] = useState<PersonalSpendRow[]>([]);
  const [category, setCategory] = useState<"All" | "Food" | "Fun">("All");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    (async () => setRows(await listPersonalSpendByMonth(yyyymm, category)))();
  }, [yyyymm, category]);

  useFocusEffect(
    React.useCallback(() => {
      (async () => {
        setRows(await listPersonalSpendByMonth(yyyymm, category));
      })();
    }, [yyyymm, category])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      setRows(await listPersonalSpendByMonth(yyyymm, category));
    } finally {
      setRefreshing(false);
    }
  };

  const onDelete = async (id: string) => {
    Alert.alert("Delete spend", "Are you sure you want to delete this item?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deletePersonalSpend(id);
          setRows(await listPersonalSpendByMonth(yyyymm, category));
        },
      },
    ]);
  };
  const autoDelete = async (id: string) => {
    try {
      await Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    await deletePersonalSpend(id);
    setRows(await listPersonalSpendByMonth(yyyymm, category));
  };

  const renderRightActions = (id: string) => (
    <View style={styles.rightActionWrap}>
      <Pressable style={styles.rightAction} onPress={() => onDelete(id)}>
        <Text style={styles.rightActionText}>Delete</Text>
      </Pressable>
    </View>
  );

  const total = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <SafeAreaView style={styles.sa} edges={["top"]}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.titleRow}>
          <Ionicons name="wallet-outline" color="#E5E7EB" size={30} />
          <Text style={styles.title}>My Spending</Text>
        </View>

        <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
          {(["All", "Food", "Fun"] as const).map((c) => (
            <Pressable
              key={c}
              onPress={() => setCategory(c)}
              style={[styles.chip, category === c && styles.chipActive]}
            >
              <Text
                style={category === c ? styles.chipTextActive : styles.chipText}
              >
                {c}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total this month</Text>
          <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
        </View>

        <FlatList
          data={rows}
          keyExtractor={(i) => i.id}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          renderItem={({ item }) => (
            <Swipeable
              renderRightActions={() => renderRightActions(item.id)}
              overshootRight={false}
              rightThreshold={96} // how far you need to pull to “open”
              friction={2} // a bit more resistance feels better
              onSwipeableOpen={(direction) => {
                // Right actions open when you swipe LEFT; direction will be "left"
                if (direction === "left") {
                  // Full swipe reached threshold → delete immediately (no alert)
                  autoDelete(item.id);
                }
              }}
            >
              <View style={styles.item}>
                <Text style={styles.itemTitle}>{item.category}</Text>
                <Text style={styles.itemAmount}>${item.amount.toFixed(2)}</Text>
              </View>
            </Swipeable>
          )}
          ListEmptyComponent={
            <Text style={{ color: "#94A3B8" }}>No spends yet.</Text>
          }
        />
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
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#111827",
  },
  chipActive: { backgroundColor: "#2F6FED" },
  chipText: { color: "#9CA3AF" },
  chipTextActive: { color: "white", fontWeight: "600" },
  totalCard: {
    backgroundColor: "#111827",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  totalLabel: { color: "#9CA3AF" },
  totalValue: { color: "#E5E7EB", fontSize: 20, fontWeight: "700" },
  item: {
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  itemTitle: { color: "#E5E7EB", fontWeight: "600" },
  itemAmount: { color: "#E5E7EB", fontWeight: "700" },
  rightActionWrap: { justifyContent: "center", alignItems: "flex-end" },
  rightAction: {
    backgroundColor: "#EF4444",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginLeft: 8,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 88,
  },
  rightActionText: { color: "white", fontWeight: "700" },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
});
