import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View, Button, Alert } from "react-native";
import React, { useEffect, useState } from "react";
import { BarCodeScanner } from "expo-barcode-scanner";
import { useSelector } from "react-redux";
import ipconfig from "../../ipconfig";

// A supervisor scans an athlete's ID-card QR (which carries the athlete's user
// id) to record that athlete's entry/exit at the supervisor's own complex.
// POST /addSession/:complexId re-checks server-side that the complex is within
// the caller's scope.
export default function QR({ navigation }) {
  const userdata = useSelector((state) => state.user.User);
  const ip = ipconfig.ip;
  const [hasPermission, setHasPermission] = useState(false);
  const [scanData, setScanData] = useState(undefined);

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text>Please grant camera permissions to app.</Text>
      </View>
    );
  }

  const handleBarCodeScanned = ({ type, data }) => {
    setScanData(data);
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    fetch(`http://${ip}:9999/addSession/${userdata.SportComplexId}`, {
      method: "POST",
      headers: myHeaders,
      body: JSON.stringify({ userId: data }),
      redirect: "follow",
    })
      .then((response) => response.json())
      .then((result) => {
        if (result.rcode === 200) {
          Alert.alert("Entry recorded", "Athlete entry marked for this complex.", [
            { text: "OK", onPress: () => navigation.navigate("ComplexDetails") },
          ]);
        } else if (result.rcode === 205) {
          Alert.alert("Exit recorded", "Athlete exit marked for this complex.", [
            { text: "OK", onPress: () => navigation.navigate("ComplexDetails") },
          ]);
        } else {
          Alert.alert(
            "Not verified",
            result.msg || "This QR code is not a valid athlete ID.",
            [{ text: "OK", onPress: () => console.log("OK Pressed") }]
          );
        }
      })
      .catch(() => {
        Alert.alert("Connection error", "Could not reach the server.", [
          { text: "OK", onPress: () => console.log("OK Pressed") },
        ]);
      });
  };

  return (
    <View style={styles.container}>
      <BarCodeScanner
        style={StyleSheet.absoluteFillObject}
        onBarCodeScanned={scanData ? undefined : handleBarCodeScanned}
      />
      {scanData && (
        <Button title="Scan Again?" onPress={() => setScanData(undefined)} />
      )}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
