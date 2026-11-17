import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity, SafeAreaView, Platform } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";

export const QrScannerModal = ({ visible, onClose, onScan, title = "Scan Attendance QR Pass" }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (visible) {
      setScanned(false);
    }
  }, [visible]);

  const handleBarcodeScanned = ({ data }) => {
    if (scanned) return;
    setScanned(true);
    if (onScan) {
      onScan(data);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
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
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              enableTorch={torch}
              barcodeScannerSettings={{
                barcodeTypes: ["qr"],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            />

            {/* Target Reticle */}
            <View style={styles.overlay}>
              <View style={styles.targetBox}>
                <View style={[styles.corner, styles.tl]} />
                <View style={[styles.corner, styles.tr]} />
                <View style={[styles.corner, styles.bl]} />
                <View style={[styles.corner, styles.br]} />
              </View>
              <Text style={styles.instruction}>
                Align the citizen or athlete QR pass inside the frame
              </Text>
            </View>
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
    position: "relative",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
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
    marginTop: 24,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
});

export default QrScannerModal;
