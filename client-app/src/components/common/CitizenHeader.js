/**
 * CitizenHeader — unified header for all Citizen/Athlete tab screens.
 * Usage:
 *   <CitizenHeader
 *     title="Attendance Ledger"
 *     subtitle="Digital Gate Check-ins & Verifications"
 *     onLogout={onLogout}          // shows power icon top-right
 *     showLogout={true}            // keep logout on the Home screen only
 *     showBack={false}             // true only for sub-flow screens
 *     onBack={navigation.goBack}
 *     watermarkIcon="stadium"      // optional MaterialCommunityIcons name
 *   />
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const SAG_DARK = '#0B3D2E';

export default function CitizenHeader({
  title,
  subtitle,
  onLogout,
  showLogout = false,
  showBack = false,
  onBack,
  watermarkIcon = 'office-building',
  rightExtra = null, // optional extra element on the right
}) {
  return (
    <View style={s.header}>
      {/* ── Top bar: back? | branding | actions ── */}
      <View style={s.topBar}>
        {/* Left: back button or spacer */}
        {showBack ? (
          <TouchableOpacity onPress={onBack} style={s.iconBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={s.iconBtn} />
        )}

        {/* Centre: SAG branding */}
        <View style={s.brandRow}>
          <View style={s.logoCircle}>
            <MaterialCommunityIcons name="run-fast" size={17} color="#fff" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.brandGov} numberOfLines={1}>GOVERNMENT OF GUJARAT</Text>
            <Text style={s.brandSag} numberOfLines={1}>Sports Authority of Gujarat (SAG)</Text>
          </View>
        </View>

        {/* Right: notifications + logout */}
        <View style={s.rightActions}>
          {rightExtra}
          <TouchableOpacity style={s.iconBtn} activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={20} color="#fff" />
            <View style={s.notifDot} />
          </TouchableOpacity>
          {showLogout && onLogout && (
            <TouchableOpacity onPress={onLogout} style={s.iconBtn} activeOpacity={0.7}>
              <Ionicons name="power-outline" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Title row + watermark ── */}
      <View style={s.titleRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.title} numberOfLines={1}>{title}</Text>
          {subtitle ? (
            <Text style={s.subtitle} numberOfLines={1}>{subtitle}</Text>
          ) : null}
        </View>
        <MaterialCommunityIcons
          name={watermarkIcon}
          size={76}
          color="rgba(255,255,255,0.07)"
          style={s.watermark}
          pointerEvents="none"
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    backgroundColor: SAG_DARK,
    paddingTop: 10,
    paddingBottom: 30,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 6,
  },
  logoCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandGov: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  brandSag: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  notifDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#f59e0b',
    borderWidth: 1,
    borderColor: SAG_DARK,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    marginTop: 2,
  },
  watermark: {
    marginTop: -6,
  },
});
