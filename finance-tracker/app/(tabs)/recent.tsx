import { useCallback, useEffect, useState } from "react";
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
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import { listRecentTransactions, type RecentItem } from "../../data/recent";
import { deleteExpense } from "../../data/expenses";
import { deletePersonalSpend } from "../../data/spend";
import { Ionicons } from "@expo/vector-icons";

export default function RecentScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<RecentItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRows(await listRecentTransactions(40));
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useFocusEffect(
    useCallback(() => {
      load();
      return () => {};
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  function onEdit(item: RecentItem) {
    if (item.type === "expense") router.push(`/edit/expense/${item.id}`);
    else router.push(`/edit/spend/${item.id}`);
  }

  function onDelete(item: RecentItem) {
    Alert.alert(
      "Delete",
      item.type === "expense"
        ? "Delete this shared expense?"
        : "Delete this personal spend?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (item.type === "expense") await deleteExpense(item.id);
            else await deletePersonalSpend(item.id);
            await load();
          },
        },
      ]
    );
  }

  const autoDelete = useCallback(
    async (item: RecentItem) => {
      try {
        await Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
      if (item.type === "expense") await deleteExpense(item.id);
      else await deletePersonalSpend(item.id);
      await load();
    },
    [load]
  );

  const renderRightActions = (item: RecentItem) => (
    <View style={{ justifyContent: "center", alignItems: "flex-end" }}>
      <Pressable
        onPress={() => onDelete(item)}
        style={{
          backgroundColor: "#EF4444",
          borderRadius: 12,
          paddingVertical: 12,
          paddingHorizontal: 16,
          marginLeft: 8,
          justifyContent: "center",
          alignItems: "center",
          minWidth: 88,
        }}
      >
        <Text style={{ color: "white", fontWeight: "700" }}>Delete</Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={styles.sa} edges={["top"]}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.titleRow}>
          <Ionicons name="time-outline" color="#E5E7EB" size={30} />
          <Text style={styles.title}>Recent</Text>
        </View>
        <FlatList
          data={rows}
          keyExtractor={(i) => `${i.type}:${i.id}`}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <Text style={{ color: "#94A3B8" }}>No transactions yet.</Text>
          }
          renderItem={({ item }) => (
            <Swipeable
              renderRightActions={() => renderRightActions(item)}
              overshootRight={false}
              rightThreshold={96}
              friction={2}
              onSwipeableOpen={(direction) => {
                if (direction === "left") {
                  autoDelete(item);
                }
              }}
            >
              <View style={styles.card}>
                <View>
                  <Text style={styles.lineTop}>
                    {item.type === "expense" ? "Shared • " : "Personal • "}
                    {item.title}
                  </Text>
                  <Text style={styles.lineSub}>
                    {new Date(item.date).toLocaleDateString()} • $
                    {item.amount.toFixed(2)}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <Pressable
                    onPress={() => onEdit(item)}
                    style={styles.smallBtn}
                  >
                    <Text style={styles.smallBtnText}>Edit</Text>
                  </Pressable>
                </View>
              </View>
            </Swipeable>
          )}
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
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#111827",
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lineTop: { color: "#E5E7EB", fontWeight: "600" },
  lineSub: { color: "#9CA3AF", marginTop: 4 },
  smallBtn: {
    backgroundColor: "#1F2937",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  dangerBtn: { backgroundColor: "#EF4444" },
  smallBtnText: { color: "#E5E7EB", fontWeight: "700" },
});
