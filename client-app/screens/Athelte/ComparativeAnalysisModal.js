import React, { useState, useEffect } from "react";
import {
  Modal,
  StyleSheet,
  View,
  TouchableOpacity,
  Button,
  Text,
  TextInput,
  Dimensions,
} from "react-native";
import { WebView } from "react-native-webview";

import { Rating } from "react-native-ratings";
import { getChartUrl } from "../../helpers/chartToken";
const ComparativeAnalysisModal = (props) => {
  const [modalVisible, setModalVisible] = useState(props.rateModal);
  const [chartUri, setChartUri] = useState("");

  useEffect(() => {
    const { currentathelteid, opponentathelteid, sportid } = props;
    if (!currentathelteid || !opponentathelteid || !sportid) return;
    let cancelled = false;
    getChartUrl(
      `/comparativeathelteperformance/${currentathelteid}/${opponentathelteid}/${sportid}`,
      {
        athleteId: currentathelteid,
        opponentAthleteId: opponentathelteid,
        sportId: sportid,
        type: "comparative",
      }
    )
      .then((uri) => {
        if (!cancelled) setChartUri(uri);
      })
      .catch(() => {
        if (!cancelled) setChartUri("");
      });
    return () => {
      cancelled = true;
    };
  }, [props.currentathelteid, props.opponentathelteid, props.sportid]);

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => {
        setModalVisible(!modalVisible);
      }}
    >
      <View style={styles.container} onTouchStart={props.modalclosehandler}>
        <WebView
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error("WebView error: ", nativeEvent);
          }}
          javaScriptEnabled={true}
          scalesPageToFit={true}
          showsHorizontalScrollIndicator={false}
          style={{
            width: Dimensions.get("screen").width - 40,
            marginVertical: 80,
            marginLeft: 20,
          }}
          source={{
            uri: chartUri,
          }}
        />
      </View>
    </Modal>
  );
};

// /comparativeathelteperformance/:athleteid/:opponentathelteid/:sportid

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    // justifyContent: "center",
  },
  card: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    shadowColor: "black",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    width: "80%",
    alignSelf: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 20,
    textAlign: "center",
    fontWeight: "bold",
    marginBottom: 10,
  },
  input: {
    shadowColor: "black",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    color: "black",
    height: 50,
    marginVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    backgroundColor: "white",
  },
  loginButton: {
    height: 50,
    backgroundColor: "#f2b69c",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    marginTop: 20,
    width: 100,
    alignSelf: "center",
    fontWeight: "bold",
  },

  buttonText: {
    color: "white",
    fontSize: 18,
  },
});

export default ComparativeAnalysisModal;
