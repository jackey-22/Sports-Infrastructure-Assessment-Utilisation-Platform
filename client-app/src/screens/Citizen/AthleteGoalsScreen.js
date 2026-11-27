import React, { useMemo } from "react";
import { RefreshControl, StyleSheet, View } from "react-native";
import AppHeader from "../../components/common/AppHeader";
import AppScreenScroll from "../../components/common/AppScreenScroll";
import MobileGoalsBadgesCard from "../../components/performance/MobileGoalsBadgesCard";
import usePerformanceResource from "../../hooks/usePerformanceResource";
import { performanceService } from "../../services/performanceService";

const GREEN = "#007D40";

export default function AthleteGoalsScreen({ onBack }) {
  const goalsRes = usePerformanceResource(performanceService.ownGoals);
  const sportsRes = usePerformanceResource(performanceService.sports);

  const uniqueSports = useMemo(() => {
    const seen = new Map();
    (sportsRes.data || []).forEach((sp) => {
      const key = String(sp?.SportName || "").trim().toLowerCase();
      if (key && !seen.has(key)) seen.set(key, sp);
    });
    return [...seen.values()];
  }, [sportsRes.data]);

  const refresh = () => Promise.all([goalsRes.reload(), sportsRes.reload()]);

  return (
    <View style={styles.root}>
      <AppScreenScroll
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            tintColor={GREEN}
            colors={[GREEN]}
            refreshing={goalsRes.loading || sportsRes.loading}
            onRefresh={refresh}
          />
        }
        header={
          <AppHeader
            title="Goals & Badges"
            subtitle="Track training targets and unlock rank badges"
            onBack={onBack}
          />
        }
      >
        <MobileGoalsBadgesCard
          goalData={goalsRes.data}
          sports={uniqueSports}
          onCreateGoal={async (payload) => {
            await performanceService.createGoal(payload);
            await goalsRes.reload();
          }}
          onCompleteGoal={async (goalId) => {
            await performanceService.completeGoal(goalId);
            await goalsRes.reload();
          }}
          onDeleteGoal={async (goalId) => {
            await performanceService.deleteGoal(goalId);
            await goalsRes.reload();
          }}
        />
      </AppScreenScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
});
