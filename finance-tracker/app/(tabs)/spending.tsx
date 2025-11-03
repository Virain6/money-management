// app/(tabs)/spending.tsx
import React, { useEffect, useState, useMemo } from "react";
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
import {
  listBudgetsByMonth,
  ensureRecurringBudgets,
  listRecurringBudgets,
  type BudgetRow,
} from "../../data/budgets";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

function getYYYYMM(d = new Date()) {
  return d.getFullYear() * 100 + (d.getMonth() + 1);
}

export default function SpendingScreen() {
  const [yyyymm, setYyyymm] = useState<number>(getYYYYMM());
  const [rows, setRows] = useState<PersonalSpendRow[]>([]);
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [filterBudgetId, setFilterBudgetId] = useState<string | null>(null); // null = All
  const [refreshing, setRefreshing] = useState(false);

  const router = useRouter();

  const [chartPoints, setChartPoints] = useState<
    { label: string; value: number; over?: boolean }[]
  >([]);

  function monthLabel(yyyymm: number) {
    const y = Math.floor(yyyymm / 100);
    const m = (yyyymm % 100) - 1; // 0-based
    return new Date(y, m, 1).toLocaleString(undefined, { month: "short" });
  }

  function lastNMonths(n: number, fromYYYYMM = yyyymm) {
    const arr: number[] = [];
    let y = Math.floor(fromYYYYMM / 100);
    let m = fromYYYYMM % 100; // 1..12
    for (let i = 0; i < n; i++) {
      arr.unshift(y * 100 + m);
      m -= 1;
      if (m === 0) {
        m = 12;
        y -= 1;
      }
    }
    return arr;
  }

  useEffect(() => {
    (async () => {
      const filter = filterBudgetId ? { budgetId: filterBudgetId } : "All";
      setRows(await listPersonalSpendByMonth(yyyymm, filter));
    })();
  }, [yyyymm, filterBudgetId]);

  useFocusEffect(
    React.useCallback(() => {
      (async () => {
        const filter = filterBudgetId ? { budgetId: filterBudgetId } : "All";
        setRows(await listPersonalSpendByMonth(yyyymm, filter));
      })();
    }, [yyyymm, filterBudgetId])
  );

  useFocusEffect(
    React.useCallback(() => {
      (async () => {
        await ensureRecurringBudgets(yyyymm);
        const b = await listBudgetsByMonth(yyyymm);
        setBudgets(b);
      })();
    }, [yyyymm])
  );

  useEffect(() => {
    if (filterBudgetId && !budgets.some((b) => b.id === filterBudgetId)) {
      setFilterBudgetId(null);
    }
  }, [budgets, filterBudgetId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const filter = filterBudgetId ? { budgetId: filterBudgetId } : "All";
      setRows(await listPersonalSpendByMonth(yyyymm, filter));
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    (async () => {
      const b = await listBudgetsByMonth(yyyymm);
      setBudgets(b);
    })();
  }, [yyyymm]);

  const computeChart = React.useCallback(async () => {
    const months = lastNMonths(6, yyyymm);
    if (!filterBudgetId) {
      // Total spent per month
      const out = await Promise.all(
        months.map(async (m) => {
          const rows = await listPersonalSpendByMonth(m, "All");
          const total = rows.reduce((s, r) => s + r.amount, 0);
          return { label: monthLabel(m), value: total };
        })
      );
      setChartPoints(out);
    } else {
      // Show TOTAL spent per month, color-coded vs budget (red if over, green if under)
      const selName =
        budgets.find((b) => b.id === filterBudgetId)?.name ?? null;
      const templates = await listRecurringBudgets();
      const out = await Promise.all(
        months.map(async (m) => {
          const monthBudgets = await listBudgetsByMonth(m);
          const match = selName
            ? monthBudgets.find(
                (b) => b.name.toLowerCase() === selName.toLowerCase()
              )
            : null;
          // cap for this month: prefer monthly instance, else fall back to template amount
          let cap = 0;
          if (match) cap = match.amount;
          else if (selName) {
            const tmpl = templates.find(
              (t) => t.name.toLowerCase() === selName.toLowerCase()
            );
            if (tmpl) cap = tmpl.amount;
          }
          // spent is the total for this budget (if no monthly instance, spent=0)
          let spent = 0;
          if (match) {
            const rows = await listPersonalSpendByMonth(m, {
              budgetId: match.id,
            });
            spent = rows.reduce((s, r) => s + r.amount, 0);
          }
          const over = cap > 0 && spent > cap; // red if over budget
          return { label: monthLabel(m), value: spent, over };
        })
      );
      setChartPoints(out);
    }
  }, [yyyymm, filterBudgetId, budgets]);

  useEffect(() => {
    computeChart();
  }, [computeChart]);

  useFocusEffect(
    React.useCallback(() => {
      computeChart();
    }, [computeChart])
  );

  const budgetNameById = useMemo(() => {
    const m = new Map<string, string>();
    budgets.forEach((b) => m.set(b.id, b.name));
    return m;
  }, [budgets]);

  const onDelete = async (id: string) => {
    Alert.alert("Delete spend", "Are you sure you want to delete this item?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deletePersonalSpend(id);
          const filter = filterBudgetId ? { budgetId: filterBudgetId } : "All";
          setRows(await listPersonalSpendByMonth(yyyymm, filter));
        },
      },
    ]);
  };
  const autoDelete = async (id: string) => {
    try {
      await Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    await deletePersonalSpend(id);
    const filter = filterBudgetId ? { budgetId: filterBudgetId } : "All";
    setRows(await listPersonalSpendByMonth(yyyymm, filter));
  };

  const renderRightActions = (id: string) => (
    <View style={styles.rightActionWrap}>
      <Pressable style={styles.rightAction} onPress={() => onDelete(id)}>
        <Text style={styles.rightActionText}>Delete</Text>
      </Pressable>
    </View>
  );

  const total = rows.reduce((s, r) => s + r.amount, 0);
  const totalColor = React.useMemo(() => {
    if (!filterBudgetId) return undefined; // use default style color
    const cap = budgets.find((b) => b.id === filterBudgetId)?.amount;
    if (cap == null) return undefined; // no cap found, keep default
    return total > cap ? "#EF4444" : "#10B981"; // red if over, green if under
  }, [filterBudgetId, budgets, total]);

  return (
    <SafeAreaView style={styles.sa} edges={["top"]}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.titleRow}>
          <Ionicons name="wallet-outline" color="#E5E7EB" size={30} />
          <Text style={styles.title}>My Spending</Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            gap: 8,
            marginBottom: 10,
            flexWrap: "wrap",
          }}
        >
          <Pressable
            onPress={() => setFilterBudgetId(null)}
            style={[styles.chip, !filterBudgetId && styles.chipActive]}
          >
            <Text
              style={!filterBudgetId ? styles.chipTextActive : styles.chipText}
            >
              All
            </Text>
          </Pressable>
          {budgets.map((b) => (
            <Pressable
              key={b.id}
              onPress={() => setFilterBudgetId(b.id)}
              style={[
                styles.chip,
                filterBudgetId === b.id && styles.chipActive,
              ]}
            >
              <Text
                style={
                  filterBudgetId === b.id
                    ? styles.chipTextActive
                    : styles.chipText
                }
              >
                {b.name}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.totalCard}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={styles.totalLabel}>
              {filterBudgetId
                ? `Total for ${budgetNameById.get(filterBudgetId) ?? "Budget"}`
                : "Total this month"}
            </Text>
            {filterBudgetId ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(`/edit/budget/${filterBudgetId}`)}
                style={{
                  paddingVertical: 4,
                  paddingHorizontal: 8,
                  borderRadius: 8,
                  backgroundColor: "#1F2937",
                }}
              >
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <Ionicons name="create-outline" size={16} color="#E5E7EB" />
                  <Text style={{ color: "#E5E7EB", fontWeight: "600" }}>
                    Edit
                  </Text>
                </View>
              </Pressable>
            ) : null}
          </View>
          <Text
            style={[
              styles.totalValue,
              totalColor ? { color: totalColor } : null,
            ]}
          >
            {filterBudgetId
              ? (() => {
                  const cap = budgets.find(
                    (b) => b.id === filterBudgetId
                  )?.amount;
                  return cap != null
                    ? `$${total.toFixed(2)} / $${cap.toFixed(2)}`
                    : `$${total.toFixed(2)}`;
                })()
              : `$${total.toFixed(2)}`}
          </Text>
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
                <Text style={styles.itemTitle}>
                  {item.budget_id
                    ? budgetNameById.get(item.budget_id) ?? "(Budget)"
                    : "(No budget)"}
                </Text>
                <Text style={styles.itemAmount}>${item.amount.toFixed(2)}</Text>
              </View>
            </Swipeable>
          )}
          ListEmptyComponent={
            <Text style={{ color: "#94A3B8" }}>No spends yet.</Text>
          }
        />
        {/* Mini chart for last 6 months */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>
            {!filterBudgetId
              ? "Last 6 months — total spent"
              : "Last 6 months — spent (red=over, green=under)"}
          </Text>
          <View style={{ height: 80 }} />

          {/** Bars */}
          <View style={styles.chartArea}>
            {(() => {
              const max = Math.max(1, ...chartPoints.map((p) => p.value));
              return chartPoints.map((p, i) => {
                const h = Math.max(2, Math.round((p.value / max) * 100));
                // pick color: blue for All, green/red for filtered
                const bg = !filterBudgetId
                  ? "#2F6FED"
                  : p.over
                  ? "#EF4444"
                  : "#10B981";
                return (
                  <View key={i} style={styles.barWrap}>
                    <Text style={styles.barValue}>${p.value.toFixed(0)}</Text>
                    <View
                      style={[
                        styles.bar,
                        { height: `${h}%`, backgroundColor: bg },
                      ]}
                    />
                    <Text style={styles.barLabel}>{p.label}</Text>
                  </View>
                );
              });
            })()}
          </View>
        </View>
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
  chartCard: {
    backgroundColor: "#111827",
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
  },
  chartTitle: { color: "#E5E7EB", fontWeight: "700", marginBottom: 8 },
  chartArea: {
    height: 140,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 6,
  },
  barWrap: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  bar: { width: 14, borderRadius: 6, backgroundColor: "#2F6FED" },
  barLabel: { color: "#9CA3AF", marginTop: 6, fontSize: 12 },
  barValue: { color: "#9CA3AF", fontSize: 10, marginBottom: 4 },

  // Split (over/under) version
  chartAreaSplit: {
    height: 160,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 6,
  },
  barWrapSplit: { flex: 1, alignItems: "center" },
  splitTop: {
    height: 70,
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  splitBottom: {
    height: 70,
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  barUnder: { width: 14, borderRadius: 6, backgroundColor: "#10B981" }, // green = under budget
  barOver: { width: 14, borderRadius: 6, backgroundColor: "#EF4444" }, // red = over budget
});
