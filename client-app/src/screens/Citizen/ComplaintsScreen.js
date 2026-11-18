import AppScreenScroll from "../../components/common/AppScreenScroll";
import AppHeader from "../../components/common/AppHeader";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, TouchableOpacity, ActivityIndicator, StyleSheet, Image, Linking, AppState, RefreshControl, Platform } from "react-native";
import { Text, TextInput } from "../../components/AppText";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { api, API_BASE_URL } from "../../api/client";
const labels = ["Supervisor", "Manager", "District Authority", "Admin"];
export default function ComplaintsScreen({
  onBack,
  user
}) {
  const [rows, setRows] = useState([]),
    [facilities, setFacilities] = useState([]),
    [view, setView] = useState("mine"),
    [filter, setFilter] = useState("all"),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [facility, setFacility] = useState(""),
    [subject, setSubject] = useState(""),
    [description, setDescription] = useState(""),
    [photo, setPhoto] = useState(null),
    [responses, setResponses] = useState({});
  const requestId = useRef(0);
  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError("");
    setRows([]);
    try {
      const result = await api.get(`/api/grievances?view=${view}`);
      if (currentRequest === requestId.current) setRows(result.data || []);
    } catch (err) {
      if (currentRequest === requestId.current) setError(err.message);
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [view]);
  const loadFacilities = useCallback(async () => {
    try {
      const result = await api.get("/api/grievances/facilities");
      setFacilities(result.data || []);
    } catch (err) {
      setError(err.message);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    loadFacilities();
  }, [loadFacilities]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active") load();
    });
    return () => subscription.remove();
  }, [load]);
  const pickPhoto = async camera => {
    try {
      const permission = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== "granted") return setError("Photo permission is required.");
      const result = await (camera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync)({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7
      });
      if (!result.canceled) setPhoto(result.assets[0]);
    } catch (err) {
      setError(err.message);
    }
  };
  const submit = async () => {
    if (!facility || !subject.trim() || !description.trim()) return setError("Select a facility and enter a title and description.");
    setBusy(true);
    setError("");
    setMessage("");
    try {
      let proof = {};
      if (photo) {
        const mime = photo.mimeType || "image/jpeg";
        if (!["image/jpeg", "image/png"].includes(mime)) throw new Error("Choose a JPEG or PNG attachment.");
        const form = new FormData();
        const name = photo.fileName || `evidence.${mime === "image/png" ? "png" : "jpg"}`;
        if (Platform.OS === "web") {
          const blob = await (await fetch(photo.uri)).blob();
          form.append("file", blob, name);
        } else form.append("file", {
          uri: photo.uri,
          name,
          type: mime
        });
        const uploaded = await api.upload("/api/uploads/attachment", form);
        proof = {
          proofUrl: uploaded.data.url,
          proofName: uploaded.data.name,
          proofKey: uploaded.data.key
        };
      }
      await api.post("/api/grievances", {
        sportsComplex: facility,
        subject,
        description,
        ...proof
      });
      setSubject("");
      setDescription("");
      setPhoto(null);
      await load();
      setMessage("Grievance submitted. View it in My grievances.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const act = async (item, action) => {
    if (Number(user?.Role ?? 0) === 0) return;
    const response = (responses[item._id] || "").trim();
    if (!response) return setError("Enter a response or escalation reason.");
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api.post(`/api/grievances/${item._id}/${action === "escalate" ? "escalate" : "respond"}`, {
        response,
        reason: response,
        resolve: action === "resolve",
        revision: item.revision
      });
      setResponses(old => ({
        ...old,
        [item._id]: ""
      }));
      await load();
      setMessage("Grievance updated.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const citizen = Number(user?.Role ?? 0) === 0;
  const staffQueue = [1, 3, 4, 5].includes(Number(user?.Role));
  const visibleRows = rows.filter(item => filter === "all" || item.workflowStatus === filter);
  return <View style={styles.root}><AppScreenScroll keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl tintColor={GREEN} colors={[GREEN]} refreshing={loading} onRefresh={() => {
      load();
      loadFacilities();
    }} />} header={<AppHeader title="Grievances" onBack={onBack} />}>

    <View style={styles.content}>
      {!!error && <View accessibilityRole="alert" style={styles.errorNotice}><Ionicons name="alert-circle-outline" size={20} color="#B42318" /><View style={{
            flex: 1,
            gap: 10
          }}><Text style={styles.errorText}>{error}</Text><GrievanceButton label="Retry" icon="refresh-outline" outline onPress={() => {
              load();
              loadFacilities();
            }} disabled={busy} /></View></View>}
      {!!message && <View style={styles.successNotice}><Ionicons name="checkmark-circle-outline" size={20} color={GREEN} /><Text style={styles.noticeText}>{message}</Text></View>}
      <View style={styles.section}>
        <SectionHeading icon="document-text-outline" title="Raise a grievance" subtitle="Report an issue related to a sports facility." />
        <Text style={styles.label}>Facility</Text>
        <View style={styles.field}><Ionicons name="business-outline" size={21} color={INK} /><Picker accessibilityLabel="Facility" enabled={!busy} selectedValue={facility} onValueChange={setFacility} style={styles.picker} dropdownIconColor={INK}><Picker.Item label="Select facility" value="" />{facilities.map(item => <Picker.Item key={item._id} label={item.name} value={item._id} />)}</Picker></View>
        <View style={styles.field}><Ionicons name="create-outline" size={22} color={INK} /><TextInput accessibilityLabel="Grievance title" placeholder="Title" placeholderTextColor="#66716C" maxLength={240} value={subject} onChangeText={setSubject} editable={!busy} style={styles.input} /></View>
        <View style={[styles.field, styles.descriptionField]}><Ionicons name="reorder-three-outline" size={24} color={INK} style={{
              marginTop: 12
            }} /><TextInput accessibilityLabel="Describe the issue" placeholder="Describe the issue" placeholderTextColor="#66716C" multiline maxLength={5000} value={description} onChangeText={setDescription} editable={!busy} textAlignVertical="top" style={[styles.input, styles.descriptionInput]} /></View>
        {photo && <View style={styles.photoRow}><Image source={{
              uri: photo.uri
            }} style={styles.photoPreview} /><Text style={[styles.smallText, {
              flex: 1
            }]} numberOfLines={2}>{photo.fileName || "Photo attached"}</Text><TouchableOpacity disabled={busy} accessibilityRole="button" accessibilityLabel="Remove photo" onPress={() => setPhoto(null)} style={styles.removePhoto}><Ionicons name="close-circle-outline" size={24} color="#B42318" /></TouchableOpacity></View>}
        <View style={styles.formActions}><GrievanceButton label="Choose photo" icon="images-outline" outline onPress={() => pickPhoto(false)} disabled={busy} /><GrievanceButton label="Take photo" icon="camera-outline" outline onPress={() => pickPhoto(true)} disabled={busy} /><GrievanceButton label={busy ? "Saving..." : "Submit grievance"} icon="paper-plane-outline" onPress={submit} disabled={busy} /></View>
      </View>
      <View style={styles.section}>
        <SectionHeading icon="clipboard-outline" title={view === "mine" ? "My grievances" : "Assigned grievances"} subtitle={view === "mine" ? "Track and view your raised grievances." : "Review, respond and manage assigned grievances."} />
        {staffQueue && <View style={styles.tabs}>{[["mine", "My grievances"], ["assigned", "Assigned grievances"]].map(([key, label]) => <TouchableOpacity key={key} disabled={busy} accessibilityRole="button" accessibilityState={{
              selected: view === key
            }} onPress={() => setView(key)} style={[styles.tab, view === key && styles.activeTab]}><Text style={[styles.tabText, view === key && styles.activeTabText]}>{label}</Text></TouchableOpacity>)}</View>}
        <View style={styles.field}><Ionicons name="filter-outline" size={21} color={INK} /><Picker accessibilityLabel="Status filter" selectedValue={filter} onValueChange={setFilter} style={styles.picker} dropdownIconColor={INK}>{["all", "Open", "Responded", "Escalated", "Resolved"].map(value => <Picker.Item key={value} label={value === "all" ? "All statuses" : value} value={value} />)}</Picker></View>
        {loading && <ActivityIndicator color={GREEN} style={{
            padding: 20
          }} />}
        {!loading && !error && !visibleRows.length && <View style={styles.empty}><Ionicons name="file-tray-outline" size={32} color="#7B9485" /><Text style={styles.smallText}>No grievances found.</Text></View>}
        {visibleRows.map(item => <GrievanceCard key={item._id} item={item} citizen={citizen} busy={busy} response={responses[item._id] || ""} onResponse={value => setResponses(old => ({
            ...old,
            [item._id]: value
          }))} onAction={action => act(item, action)} onAttachment={() => Linking.openURL(/^https?:\/\//i.test(item.photo) ? item.photo : `${API_BASE_URL}${item.photo}`).catch(err => setError(err.message))} />)}
      </View>
    </View>
  </AppScreenScroll></View>;
}
const GREEN = "#007C3E",
  INK = "#12251C";
function SectionHeading({
  icon,
  title,
  subtitle
}) {
  return <View style={styles.sectionHeading}><View style={styles.sectionIcon}><Ionicons name={icon} size={28} color="#085B2F" /></View><View style={{
      flex: 1,
      gap: 4
    }}><Text style={styles.heading}>{title}</Text><Text style={styles.subtitle}>{subtitle}</Text></View></View>;
}
export function GrievanceButton({
  label,
  icon,
  onPress,
  disabled = false,
  outline = false
}) {
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} accessibilityState={{
    disabled
  }} disabled={disabled} onPress={onPress} style={[styles.button, outline && styles.outlineButton, disabled && {
    opacity: 0.5
  }]}><LinearGradient colors={outline ? ["#F5FFF4", "#ECF9ED"] : ["#008C45", "#007336"]} style={styles.buttonInner}><Ionicons name={icon} size={21} color={outline ? "#075C2D" : "white"} /><Text style={[styles.buttonText, outline && styles.outlineButtonText]}>{label}</Text></LinearGradient></TouchableOpacity>;
}
export function GrievanceCard({
  item,
  citizen,
  busy,
  response,
  onResponse,
  onAction,
  onAttachment
}) {
  const [expanded, setExpanded] = useState(false);
  const canRespond = !citizen && item.permissions?.canRespond;
  const canResolve = !citizen && item.permissions?.canResolve;
  const canEscalate = !citizen && item.permissions?.canEscalate;
  const resolved = item.workflowStatus === "Resolved" || item.status === 1;
  const escalated = item.workflowStatus === "Escalated";
  const history = [...(item.remarks || []).filter(remark => !(item.history || []).some(event => event.reason === remark.remark && String(event.userId?._id || event.userId) === String(remark.userId?._id || remark.userId))), ...(item.history || [])].sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
  const pill = resolved ? styles.resolvedPill : escalated ? styles.escalatedPill : styles.openPill;
  return <View style={styles.grievanceCard}>
    <View style={styles.cardHeader}><Text style={styles.cardTitle}>{item.subject || "Facility grievance"}</Text><View style={[styles.statusPill, pill]}><View style={[styles.statusDot, {
          backgroundColor: resolved ? "#047857" : escalated ? "#B45309" : "#096027"
        }]} /><Text style={styles.statusText}>{item.workflowStatus || "Open"} / {item.handlingRole || labels[item.level]}</Text></View></View>
    <View style={styles.cardMeta}><View style={styles.metaDetails}><View style={styles.metaRow}><Ionicons name="location-outline" size={19} color={INK} /><Text style={styles.facilityName}>{item.sportsComplex?.name || "Sports facility"}</Text></View><View style={styles.metaRow}><Ionicons name="person-outline" size={19} color={INK} /><Text style={styles.metaText}>{item.userId?.Name || "Complainant"}</Text></View><View style={styles.metaRow}><Ionicons name="document-text-outline" size={19} color={INK} /><Text style={styles.metaText}>{item.Description}</Text></View></View>
    {!resolved && item.dueAt && <View style={styles.deadline}><View style={styles.metaRow}><Ionicons name="calendar-outline" size={18} color={INK} /><Text style={styles.smallText}>Deadline</Text></View><View style={[styles.deadlineBadge, item.overdue && styles.overdueBadge]}><Text style={[styles.deadlineText, item.overdue && {
            color: "#9F231A"
          }]}>{new Date(item.dueAt).toLocaleString("en-IN")}</Text></View>{item.overdue && <Text style={styles.overdueText}>Overdue</Text>}</View>}</View>
    {!!item.photo && <View style={styles.attachment}><GrievanceButton label="View attachment" icon="attach-outline" outline onPress={onAttachment} /></View>}
    {!!history.length && <View><TouchableOpacity accessibilityRole="button" accessibilityState={{
        expanded
      }} onPress={() => setExpanded(!expanded)} style={styles.historyToggle}><Ionicons name="time-outline" size={17} color={GREEN} /><Text style={styles.historyLabel}>{expanded ? "Hide activity" : `View activity (${history.length})`}</Text><Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={15} color={GREEN} /></TouchableOpacity>{expanded && <View style={styles.timeline}>{history.map((event, index) => <View key={index} style={styles.event}><View style={styles.eventDot} /><View style={{
            flex: 1,
            gap: 4
          }}><Text style={styles.eventTitle}>{event.userId?.Name || "System"} / {event.action || "Response"}{event.toLevel !== undefined ? ` to ${labels[event.toLevel]}` : ""}</Text>{!!(event.reason || event.remark) && <Text style={styles.smallText}>{event.reason || event.remark}</Text>}{!!event.date && <Text style={styles.eventDate}>{new Date(event.date).toLocaleString("en-IN")}</Text>}</View></View>)}</View>}</View>}
    {(canRespond || canResolve || canEscalate) && <View style={styles.staffActions}><View style={styles.field}><Ionicons name="chatbox-outline" size={21} color={INK} /><TextInput accessibilityLabel={canEscalate ? "Response or escalation reason" : "Response"} placeholder={canEscalate ? "Response or escalation reason" : "Write a response"} placeholderTextColor="#66716C" style={styles.input} multiline value={response} onChangeText={onResponse} editable={!busy} /></View><View style={styles.formActions}>{canRespond && <GrievanceButton label="Respond" icon="chatbubble-outline" outline disabled={busy} onPress={() => onAction("respond")} />}{canResolve && <GrievanceButton label="Resolve" icon="checkmark-circle-outline" disabled={busy} onPress={() => onAction("resolve")} />}{canEscalate && <GrievanceButton label="Escalate" icon="cloud-upload-outline" disabled={busy} onPress={() => onAction("escalate")} />}</View></View>}
  </View>;
}
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F3F6F9"
  },
  scrollContent: {
    paddingBottom: 22
  },
  content: {
    paddingHorizontal: 12,
    gap: 14,
    paddingTop: 0,
    width: "100%",
    maxWidth: 1100,
    alignSelf: "center"
  },
  section: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DDE4EB",
    borderRadius: 20,
    padding: 16,
    gap: 13,
    shadowColor: "#193D29",
    shadowOpacity: 0.07,
    shadowRadius: 9,
    shadowOffset: {
      width: 0,
      height: 4
    },
    elevation: 3
  },
  sectionHeading: {
    flexDirection: "row",
    gap: 13,
    alignItems: "center",
    marginBottom: 2
  },
  sectionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#DFF8E3",
    alignItems: "center",
    justifyContent: "center"
  },
  heading: {
    fontSize: 21,
    fontWeight: "800",
    color: "#111813"
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 19,
    color: "#33463A"
  },
  label: {
    fontSize: 14,
    fontWeight: "800",
    color: INK
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#BAC7D5",
    borderRadius: 12,
    paddingLeft: 13,
    gap: 10,
    backgroundColor: "#FCFDFE",
    minHeight: 48
  },
  picker: {
    flex: 1,
    color: "#243329",
    minHeight: 48,
    backgroundColor: "transparent"
  },
  input: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 12,
    paddingRight: 12,
    color: INK,
    fontSize: 14
  },
  descriptionField: {
    alignItems: "flex-start"
  },
  descriptionInput: {
    minHeight: 82
  },
  formActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    alignItems: "center",
    marginTop: 2
  },
  button: {
    borderRadius: 12,
    overflow: "hidden",
    minHeight: 43
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: "#91D49E"
  },
  buttonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 13,
    paddingVertical: 12,
    minHeight: 43
  },
  buttonText: {
    fontSize: 12,
    fontWeight: "800",
    color: "white"
  },
  outlineButtonText: {
    color: "#075C2D"
  },
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 8,
    backgroundColor: "#F1FAF2",
    borderRadius: 12
  },
  photoPreview: {
    height: 48,
    width: 48,
    borderRadius: 8
  },
  removePhoto: {
    padding: 8
  },
  tabs: {
    flexDirection: "row",
    padding: 4,
    gap: 4,
    backgroundColor: "#EEF3EF",
    borderRadius: 12
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: "center"
  },
  activeTab: {
    backgroundColor: "#D9F5DE"
  },
  tabText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#5B6F62"
  },
  activeTabText: {
    color: "#075C2D",
    fontWeight: "800"
  },
  grievanceCard: {
    borderWidth: 1,
    borderColor: "#A4CBB7",
    borderRadius: 16,
    padding: 13,
    gap: 12,
    backgroundColor: "#FCFDFE"
  },
  cardHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E7ECEF",
    paddingBottom: 10
  },
  cardTitle: {
    flex: 1,
    minWidth: 120,
    fontSize: 19,
    fontWeight: "800",
    color: "#111813"
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12
  },
  openPill: {
    backgroundColor: "#DCF7D8"
  },
  resolvedPill: {
    backgroundColor: "#DCFCE7"
  },
  escalatedPill: {
    backgroundColor: "#FEF3C7"
  },
  statusDot: {
    height: 7,
    width: 7,
    borderRadius: 4
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#123B23",
    flexShrink: 1
  },
  cardMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 13
  },
  metaDetails: {
    flex: 1,
    minWidth: 165,
    gap: 8
  },
  metaRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start"
  },
  facilityName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    color: INK,
    lineHeight: 19
  },
  metaText: {
    flex: 1,
    fontSize: 13,
    color: "#27382C",
    lineHeight: 20
  },
  smallText: {
    fontSize: 12,
    color: "#465B4D",
    lineHeight: 19
  },
  deadline: {
    gap: 7,
    borderLeftWidth: 2,
    borderLeftColor: "#E0E6EB",
    paddingLeft: 11,
    flexGrow: 1,
    flexBasis: 145
  },
  deadlineBadge: {
    borderRadius: 10,
    backgroundColor: "#FFF1F0",
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignSelf: "flex-start"
  },
  overdueBadge: {
    backgroundColor: "#FEE2E2"
  },
  deadlineText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#462B27"
  },
  overdueText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#B42318"
  },
  attachment: {
    alignItems: "flex-start"
  },
  staffActions: {
    gap: 10
  },
  historyToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 5
  },
  historyLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: GREEN
  },
  timeline: {
    gap: 12,
    paddingTop: 10
  },
  event: {
    flexDirection: "row",
    gap: 9
  },
  eventDot: {
    height: 7,
    width: 7,
    borderRadius: 4,
    backgroundColor: "#8FBE9D",
    marginTop: 5
  },
  eventTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: INK
  },
  eventDate: {
    fontSize: 10,
    color: "#7B8B80"
  },
  empty: {
    alignItems: "center",
    padding: 22,
    gap: 10
  },
  errorNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#FFF0EE",
    padding: 13,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#F5C9C3"
  },
  errorText: {
    fontSize: 12,
    color: "#B42318",
    lineHeight: 19
  },
  successNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    backgroundColor: "#E5F6E9",
    padding: 13,
    borderRadius: 13
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 19,
    color: "#075C2D"
  }
});
