import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, ScrollView, SafeAreaView, TouchableOpacity, ActivityIndicator, StyleSheet, Linking, AppState, RefreshControl, Platform } from "react-native";
import { Text, TextInput } from "../../components/AppText";
import { Picker } from "@react-native-picker/picker";
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
  const button = (title, action) => <TouchableOpacity disabled={busy} style={[styles.button, busy && {
    opacity: 0.5
  }]} onPress={action}><Text style={styles.buttonText}>{title}</Text></TouchableOpacity>;
  return <SafeAreaView style={styles.root}><ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => {
      load();
      loadFacilities();
    }} />}>
    {button("Back", onBack)}<Text style={styles.title}>Grievances</Text>
    {!!error && <View><Text accessibilityRole="alert" style={{
          color: "#b91c1c"
        }}>{error}</Text>{button("Retry", () => {
          load();
          loadFacilities();
        })}</View>}{!!message && <Text>{message}</Text>}
    <View style={styles.card}><Text style={styles.heading}>Raise a grievance</Text><Text>Facility</Text><Picker selectedValue={facility} onValueChange={setFacility}><Picker.Item label="Select facility" value="" />{facilities.map(item => <Picker.Item key={item._id} label={item.name} value={item._id} />)}</Picker>
    <TextInput accessibilityLabel="Grievance title" placeholder="Title" maxLength={240} value={subject} onChangeText={setSubject} style={styles.input} /><TextInput accessibilityLabel="Description" placeholder="Describe the issue" multiline maxLength={5000} value={description} onChangeText={setDescription} style={styles.input} />
    <View style={styles.actions}>{button("Choose photo", () => pickPhoto(false))}{button("Take photo", () => pickPhoto(true))}</View>{photo && <View><Text>{photo.fileName || "Photo selected"}</Text>{button("Remove photo", () => setPhoto(null))}</View>}{button(busy ? "Saving..." : "Submit grievance", submit)}</View>
    <View style={styles.actions}>{button("My grievances", () => setView("mine"))}{[1, 3, 4, 5].includes(Number(user?.Role)) && button("Assigned grievances", () => setView("assigned"))}</View><Text style={styles.heading}>{view === "mine" ? "My grievances" : "Assigned grievances"}</Text>
    <Picker accessibilityLabel="Status filter" selectedValue={filter} onValueChange={setFilter}>{["all", "Open", "Responded", "Escalated", "Resolved"].map(value => <Picker.Item key={value} label={value === "all" ? "All statuses" : value} value={value} />)}</Picker>
    {loading && <ActivityIndicator />}{!loading && !rows.filter(item => filter === "all" || item.workflowStatus === filter).length && <Text>No grievances found.</Text>}
    {rows.filter(item => filter === "all" || item.workflowStatus === filter).map(item => <View key={item._id} style={styles.card}><Text style={styles.heading}>{item.subject}</Text><Text>{item.sportsComplex?.name} ? {item.userId?.Name}</Text><Text>{item.workflowStatus} ? {item.handlingRole}</Text><Text>{item.Description}</Text>{item.status !== 1 && item.dueAt && <Text>Deadline: {new Date(item.dueAt).toLocaleString()}{item.overdue ? " (overdue)" : ""}</Text>}
    {!!item.photo && button("View attachment", () => Linking.openURL(/^https?:\/\//i.test(item.photo) ? item.photo : `${API_BASE_URL}${item.photo}`).catch(err => setError(err.message)))}
    {(item.remarks || []).filter(remark => !(item.history || []).some(event => event.reason === remark.remark && String(event.userId?._id || event.userId) === String(remark.userId?._id || remark.userId))).map((remark, index) => <Text key={`legacy-${index}`}>{remark.userId?.Name || "Staff"}: {remark.remark} ? {remark.date ? new Date(remark.date).toLocaleString() : ""}</Text>)}
    {(item.history || []).map((event, index) => <View key={index} style={styles.event}><Text>{event.userId?.Name || "System"} ? {event.action}{event.toLevel !== undefined ? ` to ${labels[event.toLevel]}` : ""}</Text><Text>{event.reason}</Text><Text>{event.date ? new Date(event.date).toLocaleString() : ""}</Text></View>)}
    {(item.permissions?.canRespond || item.permissions?.canEscalate) && <View><TextInput accessibilityLabel="Response or escalation reason" placeholder="Response or escalation reason" multiline value={responses[item._id] || ""} onChangeText={value => setResponses({
            ...responses,
            [item._id]: value
          })} style={styles.input} /><View style={styles.actions}>{item.permissions.canRespond && button("Respond", () => act(item, "respond"))}{item.permissions.canResolve && button("Resolve", () => act(item, "resolve"))}{item.permissions.canEscalate && button("Escalate", () => act(item, "escalate"))}</View></View>}</View>)}
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f1f5f9"
  },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 40
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#065f46"
  },
  heading: {
    fontSize: 17,
    fontWeight: "700"
  },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    gap: 12
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    padding: 12,
    borderRadius: 10,
    color: "#0f172a"
  },
  button: {
    backgroundColor: "#047857",
    padding: 12,
    borderRadius: 10,
    alignSelf: "flex-start"
  },
  buttonText: {
    color: "white",
    fontWeight: "600"
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  event: {
    borderTopWidth: 1,
    borderColor: "#e2e8f0",
    paddingTop: 8,
    gap: 4
  }
});
