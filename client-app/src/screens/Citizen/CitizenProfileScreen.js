import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import CitizenHeader from '../../components/common/CitizenHeader';

const { width } = Dimensions.get('window');

const SAG_GREEN = '#007D40';
const SAG_DARK  = '#0B3D2E';
const MINT_SOFT = '#E8F5EE';
const CARD_BG   = '#fff';

export default function CitizenProfileScreen({ navigation, user, onLogout }) {
  const [activeTab, setActiveTab] = useState('skills');

  const skills = [
    { label: 'Physical Fitness',       icon: 'dumbbell',      score: 4.8, color: '#22c55e', bg: '#dcfce7' },
    { label: 'Technical Execution',    icon: 'table-tennis',  score: 4.5, color: '#3b82f6', bg: '#dbeafe' },
    { label: 'Discipline & Punctuality', icon: 'clock-outline', score: 4.9, color: '#10b981', bg: '#d1fae5' },
    { label: 'Match Stamina',          icon: 'run-fast',      score: 4.4, color: '#f59e0b', bg: '#fef3c7' },
    { label: 'Tactical Awareness',     icon: 'target',        score: 4.6, color: '#8b5cf6', bg: '#ede9fe' },
  ];

  const sessions = [
    { day: '24', month: 'OCT', title: 'Footwork & Net Play',         duration: '1 hr 30 min', venue: 'SAG Khokhra', rating: 4.7 },
    { day: '21', month: 'OCT', title: 'Smash Technique & Accuracy',  duration: '1 hr 30 min', venue: 'SAG Khokhra', rating: 4.5 },
    { day: '18', month: 'OCT', title: 'Match Practice (Singles)',     duration: '2 hr',        venue: 'SAG Khokhra', rating: 4.6 },
  ];

  const achievements = [
    { icon: 'trophy',        iconColor: '#f59e0b', bg: '#fef3c7', border: '#fde68a', title: 'District Champion',      sub: 'U-17 (2025)'  },
    { icon: 'medal',         iconColor: SAG_GREEN, bg: '#f0fdf4', border: '#bbf7d0', title: 'SAG Selection',          sub: 'District level' },
    { icon: 'shield-check',  iconColor: SAG_GREEN, bg: MINT_SOFT,  border: '#6ee7b7', title: 'Performance Verified',  sub: 'by SAG'       },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={SAG_DARK} />
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Unified CitizenHeader ── */}
        <CitizenHeader
          title="Athlete Profile & Skills"
          subtitle="Verified Performance Records"
          watermarkIcon="office-building"
        />

        {/* ── Athlete Profile Card ── */}
        <View style={s.profileCard}>
          <View style={s.avatarRow}>
            <View style={s.avatarWrap}>
              <View style={s.avatarCircle}>
                <MaterialCommunityIcons name="account-circle" size={68} color={SAG_GREEN} />
              </View>
              <View style={s.checkBadge}>
                <Ionicons name="checkmark-circle" size={20} color={SAG_GREEN} />
              </View>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={s.nameRow}>
                <Text style={s.name} numberOfLines={1}>{user?.Name || 'Athlete'}</Text>
              </View>
              <View style={s.verifiedPill}>
                <Ionicons name="checkmark-circle" size={11} color={SAG_GREEN} />
                <Text style={s.verifiedTxt}>Verified Athlete</Text>
              </View>
              <Text style={s.role} numberOfLines={1}>Badminton Athlete</Text>
              <View style={s.locRow}>
                <Ionicons name="location" size={12} color="#ef4444" />
                <Text style={s.locTxt} numberOfLines={1}>Ahmedabad District (SAG Khokhra)</Text>
              </View>
            </View>
          </View>

          {/* 4-col stats */}
          <View style={s.statsRow}>
            {[
              { icon: 'calendar-outline',         val: 'U-19',      label: 'Category'       },
              { icon: 'tennisball-outline',        val: 'Badminton', label: 'Primary Sport'  },
              { icon: 'time-outline',              val: '2 Years',   label: 'Training Period'},
              { icon: 'shield-checkmark-outline',  val: 'Active',    label: 'SAG Status'     },
            ].map((st, i) => (
              <View key={i} style={[s.statCell, i < 3 && s.statDivider]}>
                <Ionicons name={st.icon} size={17} color={SAG_GREEN} />
                <Text style={s.statVal}  numberOfLines={1}>{st.val}</Text>
                <Text style={s.statLbl} numberOfLines={1}>{st.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Segmented Control ── */}
        <View style={s.segWrap}>
          {[
            { k: 'skills',   l: 'Overall Skills'    },
            { k: 'training', l: 'Training Sessions'  },
            { k: 'feedback', l: 'Coach Feedback'     },
          ].map(t => (
            <TouchableOpacity
              key={t.k}
              style={[s.segBtn, activeTab === t.k && s.segBtnOn]}
              onPress={() => setActiveTab(t.k)}
            >
              <Text
                style={[s.segTxt, activeTab === t.k && s.segTxtOn]}
                numberOfLines={1}
              >
                {t.l}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── 5-Pillar Skill Assessment ── */}
        <View style={s.card}>
          <View style={s.cardHead}>
            <View style={{ flex: 1 }}>
              <View style={s.row}>
                <MaterialCommunityIcons name="medal-outline" size={19} color="#f59e0b" />
                <Text style={s.cardTitle} numberOfLines={1}>5-Pillar Skill Assessment</Text>
              </View>
              <Text style={s.cardSub} numberOfLines={2}>
                Latest Assessment • By Coach Nitesh Shah • Oct 2026
              </Text>
            </View>
            <View style={s.scorePill}>
              <Text style={s.scoreNum}>4.64 / 5</Text>
            </View>
          </View>

          {skills.map((sk, i) => (
            <View key={i} style={s.skillRow}>
              <View style={[s.skillIcon, { backgroundColor: sk.bg }]}>
                <MaterialCommunityIcons name={sk.icon} size={15} color={sk.color} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={[s.row, { justifyContent: 'space-between', marginBottom: 4 }]}>
                  <Text style={s.skillLbl} numberOfLines={1}>{sk.label}</Text>
                  <Text style={s.skillScore}>{sk.score}/5</Text>
                </View>
                <View style={s.track}>
                  <View style={[s.fill, { width: `${(sk.score / 5) * 100}%`, backgroundColor: sk.color }]} />
                </View>
              </View>
            </View>
          ))}

          <View style={s.obsBox}>
            <View style={[s.row, { flexWrap: 'wrap', marginBottom: 6, gap: 4 }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={14} color={SAG_GREEN} />
              <Text style={s.obsTitle}>Latest Coach Observation</Text>
              <View style={[s.row, { marginLeft: 'auto' }]}>
                <Ionicons name="calendar-outline" size={11} color="#6b7280" />
                <Text style={s.obsDate}>  After Session • 24 Oct 2026</Text>
              </View>
            </View>
            <Text style={s.obsText}>
              "Exceptional court coverage and baseline smash precision. Recommend focusing on transition backhand drops under fatigue during third sets."
            </Text>
          </View>
        </View>

        {/* ── Recent Training Sessions ── */}
        <View style={s.card}>
          <View style={[s.row, { justifyContent: 'space-between', marginBottom: 12 }]}>
            <View style={s.row}>
              <Ionicons name="list-outline" size={18} color={SAG_GREEN} />
              <Text style={s.secTitle}>  Recent Training Sessions</Text>
            </View>
            <TouchableOpacity>
              <Text style={s.viewAll}>View All →</Text>
            </TouchableOpacity>
          </View>

          {sessions.map((ss, i) => (
            <View key={i} style={[s.sessRow, i < sessions.length - 1 && s.sessDivider]}>
              <View style={s.dateBox}>
                <Text style={s.dateDay}>{ss.day}</Text>
                <Text style={s.dateMon}>{ss.month}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.sessTitle} numberOfLines={1}>{ss.title}</Text>
                <View style={s.row}>
                  <Ionicons name="time-outline" size={11} color="#9ca3af" />
                  <Text style={s.sessMeta}> {ss.duration}</Text>
                  <Text style={s.sessMeta}>  </Text>
                  <Ionicons name="location-outline" size={11} color="#9ca3af" />
                  <Text style={s.sessMeta} numberOfLines={1}> {ss.venue}</Text>
                </View>
              </View>
              <View style={s.ratingBadge}>
                <Ionicons name="star" size={11} color="#f59e0b" />
                <Text style={s.ratingTxt}> {ss.rating}/5</Text>
              </View>
              <Ionicons name="chevron-forward" size={15} color="#d1d5db" />
            </View>
          ))}
        </View>

        {/* ── Achievements ── */}
        <View style={s.card}>
          <View style={[s.row, { marginBottom: 12 }]}>
            <MaterialCommunityIcons name="trophy-outline" size={18} color="#f59e0b" />
            <Text style={s.secTitle}>  Achievements & SAG Verifications</Text>
          </View>
          <View style={s.achRow}>
            {achievements.map((a, i) => (
              <View key={i} style={[s.achCard, { backgroundColor: a.bg, borderColor: a.border }]}>
                <MaterialCommunityIcons name={a.icon} size={28} color={a.iconColor} />
                <Text style={s.achTitle} numberOfLines={2}>{a.title}</Text>
                <Text style={s.achSub}   numberOfLines={1}>{a.sub}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: SAG_DARK },
  scroll: { flex: 1, backgroundColor: '#f8fafc' },
  row:    { flexDirection: 'row', alignItems: 'center' },

  /* Header */
  header: {
    backgroundColor: SAG_DARK,
    paddingTop: 10, paddingBottom: 30, paddingHorizontal: 16,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
  },
  topBar:     { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  iconBtn:    { padding: 4 },
  brandRow:   { flex: 1, flexDirection: 'row', alignItems: 'center', marginHorizontal: 10, gap: 8 },
  logoCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  brandGov:    { color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: '600', letterSpacing: 0.5 },
  brandSag:    { color: '#fff', fontSize: 11, fontWeight: '700' },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  headerSub:   { color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 2 },

  /* Profile card */
  profileCard: {
    backgroundColor: CARD_BG,
    marginHorizontal: 16, marginTop: -18, marginBottom: 14,
    borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
  },
  avatarRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  avatarWrap: { position: 'relative' },
  avatarCircle: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: MINT_SOFT, alignItems: 'center', justifyContent: 'center',
  },
  checkBadge: { position: 'absolute', bottom: 1, right: 1, backgroundColor: '#fff', borderRadius: 10 },
  nameRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  name:       { fontSize: 18, fontWeight: '800', color: '#111', flex: 1 },
  verifiedPill: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 3,
    backgroundColor: MINT_SOFT, borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 3, marginBottom: 4,
  },
  verifiedTxt: { fontSize: 11, color: SAG_GREEN, fontWeight: '700' },
  role:    { fontSize: 13, color: '#374151', marginBottom: 4 },
  locRow:  { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locTxt:  { fontSize: 12, color: '#6b7280', flex: 1 },

  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 12,
  },
  statCell:    { flex: 1, alignItems: 'center', gap: 3 },
  statDivider: { borderRightWidth: 1, borderRightColor: '#f3f4f6' },
  statVal: { fontSize: 13, fontWeight: '800', color: '#111', textAlign: 'center' },
  statLbl: { fontSize: 10, color: '#9ca3af', textAlign: 'center' },

  /* Segmented */
  segWrap: {
    flexDirection: 'row', backgroundColor: '#f1f5f9',
    borderRadius: 24, marginHorizontal: 16, marginBottom: 14, padding: 4,
  },
  segBtn:    { flex: 1, paddingVertical: 8, borderRadius: 20, alignItems: 'center' },
  segBtnOn:  { backgroundColor: SAG_DARK },
  segTxt:    { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  segTxtOn:  { color: '#fff', fontWeight: '700' },

  /* Card */
  card: {
    backgroundColor: CARD_BG, marginHorizontal: 16, marginBottom: 14,
    borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 5, elevation: 2,
  },
  cardHead:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#111', flex: 1 },
  cardSub:   { fontSize: 11, color: '#6b7280', marginTop: 2 },
  scorePill: {
    backgroundColor: MINT_SOFT, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  scoreNum: { fontSize: 13, fontWeight: '800', color: SAG_GREEN },

  /* Skills */
  skillRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 11, gap: 10 },
  skillIcon:  { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  skillLbl:   { fontSize: 13, color: '#374151', fontWeight: '600', flex: 1 },
  skillScore: { fontSize: 12, color: '#6b7280', fontWeight: '700' },
  track:      { height: 7, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' },
  fill:       { height: 7, borderRadius: 4 },

  /* Observation */
  obsBox: {
    backgroundColor: '#f9fafb', borderRadius: 10,
    borderLeftWidth: 3, borderLeftColor: SAG_GREEN,
    padding: 12, marginTop: 6,
  },
  obsTitle: { fontSize: 12, fontWeight: '700', color: SAG_DARK, flex: 1 },
  obsDate:  { fontSize: 10, color: '#6b7280' },
  obsText:  { fontSize: 13, color: '#374151', lineHeight: 19, fontStyle: 'italic' },

  /* Section */
  secTitle: { fontSize: 15, fontWeight: '800', color: '#111' },
  viewAll:  { fontSize: 13, color: SAG_GREEN, fontWeight: '700' },

  /* Sessions */
  sessRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  sessDivider:{ borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  dateBox: {
    backgroundColor: SAG_GREEN, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
    alignItems: 'center', minWidth: 42,
  },
  dateDay: { fontSize: 16, fontWeight: '900', color: '#fff' },
  dateMon: { fontSize: 9,  fontWeight: '700', color: 'rgba(255,255,255,0.8)', letterSpacing: 0.5 },
  sessTitle: { fontSize: 13, fontWeight: '700', color: '#111', marginBottom: 3 },
  sessMeta:  { fontSize: 11, color: '#9ca3af' },
  ratingBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fef3c7', borderRadius: 12,
    paddingHorizontal: 7, paddingVertical: 3, marginRight: 4,
  },
  ratingTxt: { fontSize: 11, fontWeight: '700', color: '#92400e' },

  /* Achievements */
  achRow:  { flexDirection: 'row', gap: 10 },
  achCard: {
    flex: 1, borderRadius: 12, borderWidth: 1,
    padding: 12, alignItems: 'center', gap: 5,
  },
  achTitle: { fontSize: 12, fontWeight: '800', color: '#111', textAlign: 'center' },
  achSub:   { fontSize: 11, color: '#6b7280', textAlign: 'center' },
});
