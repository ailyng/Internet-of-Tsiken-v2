import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

export default function QuickSetupModal({
  visible,
  initialChicksCount = "",
  initialDaysCount = "",
  onSaveChicksCount,
  onSaveDaysCount,
  onClose,
}) {
  const [chicksCount, setChicksCount] = useState(
    String(initialChicksCount ?? "")
  );
  const [daysCount, setDaysCount] = useState(String(initialDaysCount ?? ""));

  useEffect(() => {
    setChicksCount(String(initialChicksCount ?? ""));
    setDaysCount(String(initialDaysCount ?? ""));
  }, [initialChicksCount, initialDaysCount, visible]);

  const handleSaveChicks = () => onSaveChicksCount?.(chicksCount.trim());
  const handleSaveDays = () => onSaveDaysCount?.(daysCount.trim());

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Quick Overview Setup</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Number of Chicks per Batch</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter number of chicks"
              placeholderTextColor="#9ca3af"
              value={chicksCount}
              onChangeText={setChicksCount}
              keyboardType="numeric"
            />
            <TouchableOpacity
              onPress={handleSaveChicks}
              style={styles.saveButton}
            >
              <Text style={styles.saveButtonText}>Save Chicks Count</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Number of Days per Batch</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter number of days (-45)"
              placeholderTextColor="#9ca3af"
              value={daysCount}
              onChangeText={setDaysCount}
              keyboardType="numeric"
            />
            <TouchableOpacity
              onPress={handleSaveDays}
              style={styles.saveButton}
            >
              <Text style={styles.saveButtonText}>Save Days Count</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Text style={styles.backButtonText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: "90%",
    borderRadius: 16,
    padding: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    color: "#0f172a",
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    color: "#334155",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#0f172a",
    backgroundColor: "#fff",
  },
  saveButton: {
    marginTop: 12,
    backgroundColor: "#154b99",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  closeButton: {
    marginTop: 8,
    alignItems: "center",
    paddingVertical: 10,
  },
  closeButtonText: {
    color: "#1f2937",
    fontWeight: "500",
  },
  backButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#154b99",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  backButtonText: {
    color: "#1f2937",
    fontWeight: "600",
  },
});
