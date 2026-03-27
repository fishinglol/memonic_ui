import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
  Alert, Modal, TextInput, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect } from 'react';
import AddMemberSheet from '../components/sub_member';
import { API_URL, AI_URL } from './config';
import { COLORS, SHADOWS } from './theme';

export default function AccountScreen() {
  const router = useRouter();
  const [userName, setUserName] = useState('Loading...');
  const [voiceSheetVisible, setVoiceSheetVisible] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('user_name').then(name => setUserName(name || 'Unknown User'));
  }, []);

  const handleNotificationToggle = () => {
    Alert.alert(
      "Notification Preference",
      "Do you want to receive alerts and updates?",
      [
        { text: "Non-Notification", onPress: () => setNotificationsEnabled(false) },
        { text: "Notify Me", onPress: () => setNotificationsEnabled(true) }
      ]
    );
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert("Error", "Please fill out all fields.");
      return;
    }
    setPasswordLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_name: userName,
          current_password: currentPassword,
          new_password: newPassword
        })
      });
      const data = await response.json();
      if (response.ok) {
        Alert.alert("Success", "Password changed successfully.");
        setPasswordModalVisible(false);
        setCurrentPassword('');
        setNewPassword('');
      } else {
        Alert.alert("Error", data.detail || "Failed to update password.");
      }
    } catch (e) {
      Alert.alert("Error", "Failed to connect to the server.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This action is permanent and irreversible. Are you absolutely sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete", style: "destructive",
          onPress: async () => {
            setActionLoading(true);
            try {
              const aiUserId = await AsyncStorage.getItem('user_id');
              const aiFallbackId = userName;
              await fetch(`${AI_URL}/api/voice-profile/${aiUserId || aiFallbackId}`, { method: 'DELETE' });
              const response = await fetch(`${API_URL}/api/account/${userName}`, { method: 'DELETE' });
              if (response.ok) {
                await AsyncStorage.clear();
                router.replace('/');
              } else {
                const data = await response.json();
                Alert.alert("Error", data.detail || "Could not delete account.");
              }
            } catch (error) {
              console.error(error);
              Alert.alert("Error", "Server connection failed during deletion.");
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const SettingItem = ({ icon, title, subtitle, onPress }) => (
    <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.itemIconCircle}>
        <Ionicons name={icon} size={20} color={COLORS.icon} />
      </View>
      <View style={styles.itemTextContainer}>
        <Text style={styles.itemTitle}>{title}</Text>
        <Text style={styles.itemSubtitle}>{subtitle}</Text>
      </View>
      <View style={styles.chevronCircle}>
        <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.pillButton}>
          <Ionicons name="chevron-back" size={24} color={COLORS.icon} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={56} color={COLORS.icon} />
            </View>
            <TouchableOpacity style={styles.editBadge}>
              <Ionicons name="pencil" size={14} color="#fff" />
            </TouchableOpacity>
          </View>

          <Text style={styles.userName}>{userName}</Text>
          <View style={styles.badgeRow}>
            <Text style={styles.premiumText}>PREMIUM CURATOR</Text>
            <Text style={styles.badgeDot}>  •  </Text>
            <Text style={styles.memberSince}>MEMBER SINCE 2023</Text>
          </View>
        </View>

        {/* Settings Group */}
        <View style={styles.settingsGroup}>
          <SettingItem
            icon="mic-outline"
            title="Voice Owner"
            subtitle="Manage your vocal identity"
            onPress={() => setVoiceSheetVisible(true)}
          />
          <View style={styles.rowDivider} />
          <SettingItem
            icon={notificationsEnabled ? "notifications-outline" : "notifications-off-outline"}
            title="Notification"
            subtitle={notificationsEnabled ? "On (Notify Me)" : "Off (Non-Notification)"}
            onPress={handleNotificationToggle}
          />
          <View style={styles.rowDivider} />
          <SettingItem
            icon="lock-closed-outline"
            title="Change Password"
            subtitle="Secure your private access"
            onPress={() => setPasswordModalVisible(true)}
          />
        </View>

        {/* Danger Zone */}
        <TouchableOpacity style={styles.dangerZone} onPress={handleDeleteAccount} disabled={actionLoading} activeOpacity={0.7}>
          <View style={styles.dangerHeader}>
            <View style={styles.trashCircle}>
              {actionLoading ? (
                <ActivityIndicator color={COLORS.danger} size="small" />
              ) : (
                <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
              )}
            </View>
            <View style={styles.dangerTextContainer}>
              <Text style={styles.dangerTitle}>
                {actionLoading ? "Deleting..." : "Delete Account"}
              </Text>
              <Text style={styles.dangerLabel}>PERMANENT ACTION</Text>
            </View>
          </View>
          <Text style={styles.dangerDescription}>
            All your entries, voice models, and collections will be erased forever.
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <AddMemberSheet
        visible={voiceSheetVisible}
        onClose={() => setVoiceSheetVisible(false)}
      />

      {/* Change Password Modal */}
      <Modal visible={passwordModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <Text style={styles.modalSubtitle}>Please enter your current and new password.</Text>

            <View style={styles.modalInputWrapper}>
              <Ionicons name="lock-closed-outline" size={16} color={COLORS.icon} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.modalInput}
                placeholder="Current Password"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
            </View>
            <View style={styles.modalInputWrapper}>
              <Ionicons name="key-outline" size={16} color={COLORS.icon} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.modalInput}
                placeholder="New Password"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
            </View>

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => { setPasswordModalVisible(false); setCurrentPassword(''); setNewPassword(''); }}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonSave}
                onPress={handleChangePassword}
                disabled={passwordLoading}
              >
                {passwordLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: 24, paddingTop: 10, height: 50 },
  pillButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center',
    ...SHADOWS.button,
  },
  scrollContent: { alignItems: 'center', paddingBottom: 40 },

  // ── Profile ──
  profileSection: { alignItems: 'center', marginTop: 20, marginBottom: 32 },
  avatarContainer: { position: 'relative', marginBottom: 20 },
  avatarCircle: {
    width: 100, height: 100, borderRadius: 36,
    backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center',
    ...SHADOWS.card,
  },
  editBadge: {
    position: 'absolute', bottom: 0, right: -4,
    width: 32, height: 32, borderRadius: 12,
    backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: COLORS.bg,
  },
  userName: { fontSize: 28, fontFamily: 'Garamond-Bold', color: COLORS.text, marginBottom: 8 },
  badgeRow: { flexDirection: 'row', alignItems: 'center' },
  premiumText: { color: COLORS.accent, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  badgeDot: { color: COLORS.textMuted },
  memberSince: { color: COLORS.textMuted, fontSize: 11, fontWeight: '500' },

  // ── Settings Group ──
  settingsGroup: {
    width: '90%', backgroundColor: COLORS.surface, borderRadius: 24,
    paddingVertical: 6, marginBottom: 28, ...SHADOWS.card,
  },
  item: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20,
  },
  itemIconCircle: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: COLORS.surfaceDeep, justifyContent: 'center', alignItems: 'center',
    marginRight: 16, ...SHADOWS.small,
  },
  itemTextContainer: { flex: 1 },
  itemTitle: { fontSize: 17, color: COLORS.text, fontWeight: '600', fontFamily: 'Garamond-Bold' },
  itemSubtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2, fontFamily: 'Garamond-Regular' },
  chevronCircle: {
    width: 32, height: 32, borderRadius: 12,
    backgroundColor: COLORS.surfaceDeep, justifyContent: 'center', alignItems: 'center',
  },
  rowDivider: { height: 1, backgroundColor: COLORS.divider, marginHorizontal: 20 },

  // ── Danger Zone ──
  dangerZone: {
    width: '90%', backgroundColor: COLORS.surface, borderRadius: 24, padding: 20,
    ...SHADOWS.card,
  },
  dangerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  trashCircle: {
    width: 44, height: 44, borderRadius: 16,
    backgroundColor: COLORS.dangerSoft, justifyContent: 'center', alignItems: 'center',
    marginRight: 16,
  },
  dangerTextContainer: { flex: 1 },
  dangerTitle: { fontSize: 18, color: COLORS.danger, fontWeight: 'bold', fontFamily: 'Garamond-Bold' },
  dangerLabel: { fontSize: 10, color: COLORS.danger, fontWeight: '700', letterSpacing: 1, marginTop: 2 },
  dangerDescription: { fontSize: 13, color: COLORS.textMuted, lineHeight: 18, fontFamily: 'Garamond-Regular' },

  // ── Modal ──
  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'center', alignItems: 'center' },
  modalContainer: {
    width: '85%', backgroundColor: COLORS.surface, borderRadius: 28, padding: 24,
    ...SHADOWS.card,
  },
  modalTitle: { fontSize: 22, color: COLORS.text, fontFamily: 'Garamond-Bold', marginBottom: 5 },
  modalSubtitle: { fontSize: 14, color: COLORS.textMuted, fontFamily: 'Garamond-Regular', marginBottom: 20 },
  modalInputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surfaceDeep, borderRadius: 16,
    paddingHorizontal: 14, marginBottom: 14,
  },
  modalInput: {
    flex: 1, height: 50, color: COLORS.text, fontSize: 16, fontFamily: 'Garamond-Regular',
  },
  modalButtonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  modalButtonCancel: {
    flex: 1, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.surfaceDeep, marginRight: 10,
  },
  modalButtonSave: {
    flex: 1, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.accent, marginLeft: 10,
    ...SHADOWS.button, shadowColor: COLORS.accent, shadowOpacity: 0.25,
  },
  modalButtonCancelText: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  modalButtonSaveText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
