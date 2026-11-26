import { Text } from "../components/AppText";
import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

// Citizen Screens
import CitizenDashboardScreen from "../screens/Citizen/CitizenDashboardScreen";
import AttendanceHistoryScreen from "../screens/Citizen/AttendanceHistoryScreen";
import ComplaintsScreen from "../screens/Citizen/ComplaintsScreen";
import AthletePerformanceScreen from "../screens/Citizen/AthletePerformanceScreen";
import CitizenProfileScreen from "../screens/Citizen/CitizenProfileScreen";

// Supervisor Screens
import SupervisorScanScreen from "../screens/Supervisor/GateScannerScreen";
import GateOperatorsScreen from "../screens/Manager/GateOperatorsScreen";

// Coach Screens
import CoachDashboardScreen from "../screens/Coach/CoachDashboardScreen";
import RateAthleteScreen from "../screens/Coach/RateAthleteScreen";

// Manager Screens
import ManagerDashboardScreen from "../screens/Manager/ManagerDashboardScreen";
import FacilityAuditScreen from "../screens/Manager/FacilityAuditScreen";
import GrantProofUploadScreen from "../screens/Manager/GrantProofUploadScreen";

// Authority / DSO Screens
import DsoDashboardScreen from "../screens/Authority/DsoDashboardScreen";

// State Admin Screens
import AdminCommandDeskScreen from "../screens/Admin/AdminCommandDeskScreen";
import GrantAllocationScreen from "../screens/Admin/GrantAllocationScreen";
import AssessmentRecordsScreen from "../screens/Admin/AssessmentRecordsScreen";

// Public Exploration (available across roles)
import GujaratExploreMapScreen from "../screens/Public/GujaratExploreMapScreen";
import ComplexDetailScreen from "../screens/Public/ComplexDetailScreen";
import BookingCheckoutScreen from "../screens/Public/BookingCheckoutScreen";
import AchievementsScreen from "../screens/Common/AchievementsScreen";

export const RoleNavigator = ({ user, onLogout }) => {
  const role = user?.Role !== undefined ? Number(user.Role) : 0;
  const [activeTab, setActiveTab] = useState("home");
  const [targetAthlete, setTargetAthlete] = useState(null);
  const [achievementTarget, setAchievementTarget] = useState(null);
  const [coachRefreshKey, setCoachRefreshKey] = useState(0);
  const [targetFacility, setTargetFacility] = useState(null);
  const [bookingFacility, setBookingFacility] = useState(null);

  // Clean, concise 1-word tab labels that never wrap or overflow
  const getTabsForRole = () => {
    switch (role) {
      case 6:
        return [{ key: "home", label: "Gate scanner", icon: "qr-code" }, { key: "complaints", label: "Grievances", icon: "warning-outline" }];
      case 5: // State Admin
        return [
          { key: "home", label: "State Desk", icon: "shield-checkmark" },
          { key: "allocate", label: "Grants", icon: "cash-outline" },
          { key: "assessments", label: "Assessments", icon: "camera-outline" },
          { key: "explore", label: "Districts", icon: "map-outline" },
          { key: "complaints", label: "Grievances", icon: "warning-outline" },
        ];
      case 4: // DSO Authority
        return [
          { key: "home", label: "DSO Desk", icon: "business" },
          { key: "explore", label: "Complexes", icon: "map-outline" },
          { key: "complaints", label: "Grievances", icon: "warning-outline" },
        ];
      case 3: // Complex Manager
        return [
          { key: "home", label: "Overview", icon: "speedometer" },
          { key: "staff", label: "Gate staff", icon: "people-outline" },
          { key: "audit", label: "Assessment", icon: "camera-outline" },
          { key: "grants", label: "Grants", icon: "cloud-upload-outline" },
          { key: "complaints", label: "Grievances", icon: "warning-outline" },
        ];
      case 2: // Coach
        return [
          { key: "home", label: "Squad", icon: "people" },
          { key: "rate", label: "Evaluate", icon: "star-outline" },
          { key: "achievements", label: "Awards", icon: "trophy-outline" },
          { key: "explore", label: "Facilities", icon: "business-outline" },
          { key: "complaints", label: "Issues", icon: "warning-outline" },
        ];
      case 1: // Supervisor
        return [
          { key: "home", label: "Scanner", icon: "qr-code" },
          { key: "attendance", label: "Log", icon: "time-outline" },
          { key: "complaints", label: "Reports", icon: "warning-outline" },
        ];
      case 0: // Citizen / Athlete (Matches exact bottom navigation from screenshots)
      default:
        return [
          { key: "home", label: "Home", icon: "home-outline" },
          { key: "explore", label: "Explore", icon: "compass-outline" },
          { key: "skills", label: "Skills", icon: "ribbon-outline" },
          { key: "checkins", label: "Check-ins", icon: "calendar" },
          { key: "grievance", label: "Grievance", icon: "alert-circle-outline" },
        ];
    }
  };

  const tabs = getTabsForRole();

  // Screen Dispatcher
  const renderScreen = () => {
    // Sub-flows
    if (bookingFacility) {
      return (
        <BookingCheckoutScreen
          facility={bookingFacility}
          onBack={() => setBookingFacility(null)}
          onDone={() => {
            setBookingFacility(null);
            setActiveTab("home");
          }}
        />
      );
    }

    if (targetFacility) {
      return (
        <ComplexDetailScreen
          facility={targetFacility}
          canRate={role === 0}
          onBack={() => setTargetFacility(null)}
          onBookSlot={(fac) => {
            setTargetFacility(null);
            setBookingFacility(fac);
          }}
        />
      );
    }

    if (targetAthlete) {
      return (
        <RateAthleteScreen
          athlete={targetAthlete}
          onBack={() => setTargetAthlete(null)}
          onSaved={() => {
            setTargetAthlete(null);
            setCoachRefreshKey((k) => k + 1);
          }}
        />
      );
    }

    if (achievementTarget) {
      return (
        <AchievementsScreen
          role="coach"
          athlete={achievementTarget}
          onBack={() => setAchievementTarget(null)}
        />
      );
    }

    if (activeTab === "complaints" || activeTab === "grievance") return <ComplaintsScreen user={user} onBack={() => setActiveTab("home")} />;

    if (role === 6) return <SupervisorScanScreen user={user} onLogout={onLogout} />;

    // Role 5: State SAG Admin
    if (role === 5) {
      if (activeTab === "achievements") {
        return <AchievementsScreen role="admin" onBack={() => setActiveTab("home")} onLogout={onLogout} />;
      }
      if (activeTab === "allocate") {
        return <GrantAllocationScreen onBack={() => setActiveTab("home")} onAllocated={() => setActiveTab("home")} />;
      }
      if (activeTab === "assessments") {
        return <AssessmentRecordsScreen onBack={() => setActiveTab("home")} />;
      }
      if (activeTab === "explore") {
        return <GujaratExploreMapScreen onSelectFacility={(fac) => setTargetFacility(fac)} onBack={() => setActiveTab("home")} />;
      }
      if (activeTab === "complaints") {
        return <ComplaintsScreen onBack={() => setActiveTab("home")} />;
      }
      return <AdminCommandDeskScreen user={user} onLogout={onLogout} onNavigateTab={setActiveTab} />;
    }

    // Role 4: DSO / Authority
    if (role === 4) {
      if (activeTab === "explore") {
        return <GujaratExploreMapScreen onSelectFacility={(fac) => setTargetFacility(fac)} onBack={() => setActiveTab("home")} />;
      }
      if (activeTab === "complaints") {
        return <ComplaintsScreen onBack={() => setActiveTab("home")} />;
      }
      return <DsoDashboardScreen user={user} onLogout={onLogout} onNavigateTab={setActiveTab} />;
    }

    // Role 3: Complex Manager
    if (role === 3) {
      if (activeTab === "achievements") {
        return <AchievementsScreen role="manager" onBack={() => setActiveTab("home")} onLogout={onLogout} />;
      }
      if (activeTab === "staff") return <GateOperatorsScreen onBack={() => setActiveTab("home")} />;
      if (activeTab === "audit") {
        return <FacilityAuditScreen onBack={() => setActiveTab("home")} />;
      }
      if (activeTab === "grants") {
        return <GrantProofUploadScreen onBack={() => setActiveTab("home")} onSubmitted={() => setActiveTab("home")} />;
      }
      if (activeTab === "complaints") {
        return <ComplaintsScreen onBack={() => setActiveTab("home")} />;
      }
      return <ManagerDashboardScreen user={user} onLogout={onLogout} onNavigateTab={setActiveTab} />;
    }

    // Role 2: Coach / Instructor
    if (role === 2) {
      if (activeTab === "achievements") {
        return <AchievementsScreen role="coach" onBack={() => setActiveTab("home")} onLogout={onLogout} />;
      }
      if (activeTab === "rate") {
        return (
          <RateAthleteScreen
            athlete={null}
            onBack={() => setActiveTab("home")}
            onSaved={() => {
              setCoachRefreshKey((k) => k + 1);
              setActiveTab("home");
            }}
          />
        );
      }
      if (activeTab === "explore") {
        return <GujaratExploreMapScreen onSelectFacility={(fac) => setTargetFacility(fac)} onBack={() => setActiveTab("home")} />;
      }
      if (activeTab === "complaints") {
        return <ComplaintsScreen onBack={() => setActiveTab("home")} />;
      }
      return (
        <CoachDashboardScreen
          key={coachRefreshKey}
          user={user}
          onLogout={onLogout}
          onRateAthlete={(ath) => setTargetAthlete(ath)}
          onViewAchievements={(ath) => {
            if (ath) setAchievementTarget(ath);
            else setActiveTab("achievements");
          }}
        />
      );
    }

    // Role 1: Field Supervisor
    if (role === 1) {
      if (activeTab === "attendance") {
        return <AttendanceHistoryScreen onBack={() => setActiveTab("home")} />;
      }
      if (activeTab === "complaints") {
        return <ComplaintsScreen onBack={() => setActiveTab("home")} />;
      }
      return <SupervisorScanScreen user={user} onLogout={onLogout} />;
    }

    // Role 0: Citizen & Athlete
    if (activeTab === "checkins" || activeTab === "attendance") {
      return <AttendanceHistoryScreen onBack={() => setActiveTab("home")} />;
    }
    if (activeTab === "grievance" || activeTab === "complaints") {
      return <ComplaintsScreen onBack={() => setActiveTab("home")} />;
    }
    if (activeTab === "profile") {
      return <CitizenProfileScreen user={user} onBack={() => setActiveTab("skills")} onLogout={onLogout} />;
    }
    if (activeTab === "skills" || activeTab === "performance") {
      return <AthletePerformanceScreen onBack={() => setActiveTab("home")} onProfile={() => setActiveTab("profile")} />;
    }
    if (activeTab === "explore" || activeTab === "events") {
      return <GujaratExploreMapScreen canRate onSelectFacility={(fac) => setTargetFacility(fac)} onBack={() => setActiveTab("home")} />;
    }

    return (
      <CitizenDashboardScreen
        user={user}
        onLogout={onLogout}
        onNavigateTab={(tab) => {
          if (tab === "attendance") setActiveTab("checkins");
          else if (tab === "complaints") setActiveTab("grievance");
          else if (tab === "profile") setActiveTab("profile");
          else setActiveTab(tab);
        }}
      />
    );
  };

  return (
    <View style={styles.rootContainer}>
      <View style={styles.screenWrapper}>{renderScreen()}</View>

      {/* Styled Bottom Navigation Bar (No horizontal overflow) */}
      {!targetFacility && !bookingFacility && !targetAthlete && !achievementTarget && (
        <View style={styles.bottomBar}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={tab.icon}
                  size={19}
                  color={isActive ? "#007D40" : "#64748b"}
                />
                <Text
                  style={[styles.tabText, isActive && styles.tabTextActive]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  screenWrapper: {
    flex: 1,
  },
  bottomBar: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 4,
    justifyContent: "space-between",
    alignItems: "center",
  },
  tabButton: {
    flex: 1, // evenly distributes width across all screens
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 0,
  },
  tabButtonActive: {
    backgroundColor: "#dcfce7", // Light green container for active tab as in screenshot
  },
  tabText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 2,
    textAlign: "center",
  },
  tabTextActive: {
    color: "#007D40",
    fontWeight: "800",
  },
});

export default RoleNavigator;
