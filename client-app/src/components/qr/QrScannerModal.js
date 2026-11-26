import { Text } from "../AppText";
import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Modal, TouchableOpacity, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";

export const QrScannerModal = ({ visible, onClose, onScan, title = "Scan Attendance QR Pass" }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [session, setSession] = useState(0);
  const [modernFallback, setModernFallback] = useState(false);
  const scanHandled = useRef(false);
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  const useModernScanner = Platform.OS === "android" && CameraView.isModernBarcodeScannerAvailable;

  useEffect(() => { onScanRef.current = onScan; }, [onScan]);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (visible) {
      setScanned(false);
      setCameraReady(false);
      setCameraError("");
      setModernFallback(false);
      scanHandled.current = false;
      setSession((value) => value + 1);
    }
  }, [visible]);

  useEffect(() => {
    if (visible && permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [visible, permission, requestPermission]);

  useEffect(() => {
    if (!visible || !permission?.granted || !useModernScanner || modernFallback) return undefined;
    let active = true;
    const subscription = CameraView.onModernBarcodeScanned(({ data }) => {
      if (!active || scanHandled.current) return;
      scanHandled.current = true;
      onScanRef.current?.(data);
    });
    CameraView.launchScanner({ barcodeTypes: ["qr"] }).catch((error) => {
      if (!active) return;
      const message = String(error?.message || error || "");
      if (/cancel/i.test(message)) {
        onCloseRef.current?.();
      } else {
        setCameraError("The system scanner is unavailable. Using the in-app camera instead.");
        setModernFallback(true);
      }
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, [visible, permission?.granted, useModernScanner, modernFallback]);

  const handleBarcodeScanned = ({ data }) => {
    if (scanned || scanHandled.current) return;
    scanHandled.current = true;
    setScanned(true);
    if (onScan) {
      onScan(data);
    }
  };

  if (!visible) return null;
  if (useModernScanner && permission?.granted && !modernFallback) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" hardwareAccelerated onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={() => setTorch(!torch)} style={styles.torchBtn}>
            <Ionicons name={torch ? "flash" : "flash-off"} size={22} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {!permission ? (
          <View style={styles.centerMsg}>
            <Text style={styles.msgText}>Requesting camera permission...</Text>
          </View>
        ) : !permission.granted ? (
          <View style={styles.centerMsg}>
            <Ionicons name="camera-outline" size={48} color={colors.slate[400]} />
            <Text style={styles.msgText}>Camera access is required to scan passes.</Text>
            <TouchableOpacity onPress={requestPermission} style={styles.grantBtn}>
              <Text style={styles.grantBtnText}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cameraWrapper}>
            <View style={styles.cameraStage}>
            <CameraView
              key={`gate-camera-${session}`}
                style={styles.camera}
              facing="back"
              enableTorch={torch}
              barcodeScannerSettings={{
                barcodeTypes: ["qr"],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
              onCameraReady={() => setCameraReady(true)}
              onMountError={(event) => setCameraError(event?.message || "The camera could not start.")}
            />

            {/* Target Reticle */}
            <View pointerEvents="none" style={styles.overlay}>
              <View style={styles.targetBox}>
                <View style={[styles.corner, styles.tl]} />
                <View style={[styles.corner, styles.tr]} />
                <View style={[styles.corner, styles.bl]} />
                <View style={[styles.corner, styles.br]} />
              </View>
            </View>
            {!cameraReady && !cameraError ? <View pointerEvents="none" style={styles.cameraStatus}><Text style={styles.msgText}>Starting camera…</Text></View> : null}
            {!!cameraError ? <View style={styles.cameraStatus}><Text style={styles.msgText}>{cameraError}</Text><TouchableOpacity onPress={() => { setCameraError(""); setCameraReady(false); setSession((value) => value + 1); }} style={styles.grantBtn}><Text style={styles.grantBtnText}>Retry camera</Text></TouchableOpacity></View> : null}
            </View>
            <Text style={styles.instruction}>Align the citizen or athlete QR pass inside the frame</Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#000000",
  },
  closeBtn: {
    padding: 8,
  },
  torchBtn: {
    padding: 8,
  },
  title: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  centerMsg: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  msgText: {
    color: "#ffffff",
    fontSize: 15,
    textAlign: "center",
    marginVertical: 14,
  },
  grantBtn: {
    backgroundColor: colors.gov.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  grantBtnText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  cameraWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cameraStage: {
    width: "100%",
    aspectRatio: 1,
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#111111",
  },
  camera: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  cameraStatus: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    padding: 24,
  },
  targetBox: {
    width: 250,
    height: 250,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 28,
    height: 28,
    borderColor: colors.gov.primary,
  },
  tl: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  tr: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bl: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  br: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  instruction: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    textAlign: "center",
    marginTop: 24,
    marginHorizontal: 20,
  },
});

export default QrScannerModal;
