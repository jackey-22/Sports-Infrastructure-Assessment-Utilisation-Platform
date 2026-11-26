import AppScreenScroll from "../../components/common/AppScreenScroll";
import AppHeader from "../../components/common/AppHeader";
import React, { useEffect, useState } from "react";
import { View, Image, TouchableOpacity, StyleSheet, Linking, Share, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../components/AppText";
import { Button, StateMessage, ui, GREEN } from "../../components/FacilityUI";
import { colors } from "../../theme/colors";
import { loadFacilities, imageUrl, timingLabel, startingPrice, AMENITIES } from "../../services/facilityService";
import BookingCheckoutScreen from "./BookingCheckoutScreen";
import CitizenRatingModal from "../../components/citizen/CitizenRatingModal";

export default function ComplexDetailScreen({
  route,
  navigation,
  facility: supplied,
  onBookSlot,
  onBack,
  canRate = false,
}) {
  const selected = supplied || route?.params?.facility;
  const [facility, setFacility] = useState(selected);
  const [loading, setLoading] = useState(!!selected?.id);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [photo, setPhoto] = useState(0);
  const [booking, setBooking] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const back = onBack || (typeof navigation?.goBack === "function" ? () => navigation.goBack() : undefined);

  useEffect(() => {
    let alive = true;
    if (!selected?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    loadFacilities({ id: selected.id })
      .then((result) => {
        if (alive) {
          if (!result.data?.length) throw new Error("This facility is no longer available.");
          setFacility(result.data[0]);
          setPhoto(0);
        }
      })
      .catch((err) => {
        if (alive) setError(err.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [selected?.id, revision]);

  if (booking) {
    return (
      <BookingCheckoutScreen
        facility={facility}
        onBack={() => setBooking(false)}
        onDone={() => setBooking(false)}
      />
    );
  }

  if (!facility) {
    return (
      <View style={ui.safe}>
        <View style={ui.screen}>
          <AppScreenScroll
            contentContainerStyle={ui.content}
            header={<AppHeader title="Facility details" onBack={back} />}
          >
            <StateMessage
              title="No facility selected"
              message="Choose a facility from Explore."
              action={back ? "Go back" : undefined}
              onAction={back}
            />
          </AppScreenScroll>
        </View>
      </View>
    );
  }

  const photos = [
    ...new Set(
      [
        facility.picture,
        ...(facility.gallery || []),
        ...(facility.sports || []).flatMap((sp) => sp.images || (sp.image ? [sp.image] : [])),
        ...(facility.conditionPhotos || []).map((cp) => cp.url),
      ]
        .map(imageUrl)
        .filter(Boolean)
    ),
  ];

  const score = facility.condition?.score;
  const price = startingPrice(facility);
  const amenities = AMENITIES.filter((a) => facility.amenities?.[a.key]);
  const bookable = facility.status === "Active" && facility.sports?.some((s) => s.bookable);

  const contact = (value, type) =>
    value && value !== "Not specified" ? (
      <TouchableOpacity
        accessibilityRole="link"
        onPress={() =>
          Linking.openURL(
            type === "tel" ? `tel:${value.replace(/[^+0-9]/g, "")}` : `mailto:${value}`
          )
        }
        style={[ui.row, { paddingVertical: 8 }]}
      >
        <Ionicons name={type === "tel" ? "call-outline" : "mail-outline"} size={18} color={GREEN} />
        <Text style={[ui.muted, { flex: 1, color: GREEN, fontSize: 12 }]}>{value}</Text>
      </TouchableOpacity>
    ) : null;

  return (
    <View style={ui.safe}>
      <View style={ui.screen}>
        <AppScreenScroll
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 28 }}
          header={
            <AppHeader
              title={facility.name}
              subtitle={`${facility.district || "Gujarat"} | ${facility.facilityType || facility.category || "Sports complex"}`}
              onBack={back}
              actions={[
                {
                  label: "Share facility",
                  icon: "share-social-outline",
                  onPress: () =>
                    Share.share({
                      message: `${facility.name}\n${facility.location || facility.district}\n${timingLabel(facility)}`,
                    }),
                },
              ]}
            />
          }
        >
          <View style={ui.content}>
            {loading && <ActivityIndicator color={GREEN} />}
            {!!error && (
              <View style={ui.card}>
                <Text style={ui.error}>{error}</Text>
                <Button secondary onPress={() => setRevision((v) => v + 1)}>
                  Retry live details
                </Button>
              </View>
            )}

            {/* Photo Gallery */}
            <View style={s.gallery}>
              {photos.length ? (
                <Image source={{ uri: photos[photo] }} style={s.heroImage} />
              ) : (
                <Ionicons name="business-outline" size={50} color="#8CB49A" />
              )}
              {photos.length > 1 && (
                <>
                  <TouchableOpacity
                    accessibilityLabel="Previous photo"
                    style={[s.photoArrow, { left: 10 }]}
                    onPress={() => setPhoto((v) => (v + photos.length - 1) % photos.length)}
                  >
                    <Ionicons name="chevron-back" size={22} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityLabel="Next photo"
                    style={[s.photoArrow, { right: 10 }]}
                    onPress={() => setPhoto((v) => (v + 1) % photos.length)}
                  >
                    <Ionicons name="chevron-forward" size={22} color="white" />
                  </TouchableOpacity>
                </>
              )}
              {photos.length > 0 && (
                <View style={s.counter}>
                  <Text style={{ color: "white", fontSize: 11, fontWeight: "700" }}>
                    {photo + 1} / {photos.length}
                  </Text>
                </View>
              )}
            </View>

            {/* Venue Overview */}
            <View style={ui.card}>
              <Text style={s.venueTitle}>{facility.name}</Text>
              <Text style={[ui.muted, { marginTop: 6, marginBottom: 10, fontSize: 12 }]}>
                {facility.location || "Address not provided"}
                {facility.district ? ` · ${facility.district}` : ""}
              </Text>
              <View style={[ui.badge, { alignSelf: "flex-start" }]}>
                <Text style={ui.badgeText}>
                  {facility.condition?.grade || "Condition not assessed"}
                </Text>
              </View>

              <View style={s.metrics}>
                {[
                  [facility.details?.area ? `${facility.details.area} acres` : "Not provided", "Total area"],
                  [facility.operationalSince || "Not provided", "Operational since"],
                  [facility.status || "Active", "Facility status"],
                ].map(([value, label]) => (
                  <View key={label} style={s.metric}>
                    <Text style={s.metricValue}>{value}</Text>
                    <Text style={ui.muted}>{label}</Text>
                  </View>
                ))}
              </View>
              <Text style={ui.muted}>{facility.ownership || "Sports Authority of Gujarat"}</Text>
            </View>

            {/* Facility Condition Index Card (Spacious & Unclipped) */}
            <View style={s.fciCard}>
              <View style={s.fciHeaderRow}>
                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  <Text style={s.fciEyebrow}>INFRASTRUCTURE HEALTH</Text>
                  <Text style={s.fciTitle}>Facility Condition Index</Text>
                </View>
                <View style={s.scorePill}>
                  <Text style={s.scoreNum}>{score ?? "—"}</Text>
                  <Text style={s.scoreOutOf}> / 100</Text>
                </View>
              </View>

              {typeof score === "number" && (
                <View style={s.track}>
                  <View
                    style={[
                      s.fill,
                      { width: `${Math.max(0, Math.min(100, score))}%` },
                    ]}
                  />
                </View>
              )}

              <Text style={s.fciNotes}>
                {facility.condition?.notes || "Assessment notes not provided"}
              </Text>
              {!!facility.condition?.lastInspectionDate && (
                <View style={s.fciDateRow}>
                  <Ionicons name="calendar-outline" size={14} color="#065F46" />
                  <Text style={s.fciDateText}>
                    Last inspection: {facility.condition.lastInspectionDate}
                  </Text>
                </View>
              )}
            </View>

            {/* Infrastructure Amenities */}
            <View style={ui.card}>
              <Text style={ui.sectionTitle}>Infrastructure amenities</Text>
              <View style={s.amenities}>
                {amenities.map((a) => (
                  <View style={s.amenity} key={a.key}>
                    <Ionicons name={a.icon} size={24} color={GREEN} />
                    <Text style={s.amenityLabel}>{a.label}</Text>
                  </View>
                ))}
              </View>
              {!amenities.length && <Text style={ui.muted}>No amenities recorded.</Text>}
            </View>

            {/* Sports, Rates & Subscription Plans */}
            <View style={ui.card}>
              <Text style={ui.sectionTitle}>Sports, rates &amp; plans</Text>
              {facility.sports?.map((sport, index) => (
                <View style={s.sport} key={`${sport.id}-${index}`}>
                  <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                    <Text style={s.sportName}>{sport.name}</Text>
                    <Text style={ui.muted}>
                      {sport.bookable ? "Online slots available" : "Contact facility for availability"}
                    </Text>
                    <Text style={[ui.muted, { color: sport.condition ? GREEN : colors.slate[400] }]}>
                      {sport.condition
                        ? `${sport.condition.grade} · ${sport.condition.score}/100 condition`
                        : "Condition not assessed"}
                    </Text>
                    {!!sport.subscriptionPlans?.length && (
                      <View style={s.plansWrap}>
                        {sport.subscriptionPlans.map((p) => (
                          <View key={p._id || p.name} style={s.planChip}>
                            <Text style={s.planChipText}>
                              {p.name}: ₹{p.price}/{p.durationType === "yearly" ? "yr" : "mo"}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                  <View style={s.rateBadge}>
                    <Text style={s.rate}>
                      {sport.price ? `₹${sport.price.amount}/${sport.price.unit || "slot"}` : "Contact"}
                    </Text>
                  </View>
                </View>
              ))}
              {!facility.sports?.length && <Text style={ui.muted}>No sports configured.</Text>}
            </View>

            {canRate ? (
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => setRatingOpen(true)}
                style={s.ratingAction}
              >
                <Ionicons name="star" size={22} color="#F59E0B" />
                <View style={{ flex: 1 }}>
                  <Text style={s.ratingTitle}>Rate facility, sport or coach</Text>
                  <Text style={ui.muted}>Share a star rating or update your previous review.</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={GREEN} />
              </TouchableOpacity>
            ) : null}

            {/* Administration & Contact */}
            <View style={ui.card}>
              <Text style={ui.sectionTitle}>Administration &amp; contact</Text>
              <View style={[ui.row, { marginTop: 12 }]}>
                <Ionicons name="person-circle-outline" size={34} color={GREEN} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.metricValue}>{facility.contactPerson || "Facility administration"}</Text>
                  <Text style={ui.muted}>{timingLabel(facility)}</Text>
                </View>
              </View>
              {contact(facility.contactPhone, "tel")}
              {contact(facility.contactEmail, "email")}
              {Number.isFinite(facility.latitude) && Number.isFinite(facility.longitude) && (
                <View style={{ marginTop: 8 }}>
                  <Button
                    secondary
                    onPress={() =>
                      Linking.openURL(
                        `https://www.google.com/maps/search/?api=1&query=${facility.latitude},${facility.longitude}`
                      )
                    }
                  >
                    Get directions ↗
                  </Button>
                </View>
              )}
            </View>
          </View>
        </AppScreenScroll>

        <CitizenRatingModal visible={ratingOpen} facility={facility} onClose={() => setRatingOpen(false)} />

        <View style={s.bottom}>
          <View style={{ flex: 1 }}>
            <Text style={ui.muted}>Pay &amp; play - from</Text>
            <Text style={s.price}>{price != null ? `₹${price}` : "Contact facility"}</Text>
          </View>
          <Button
            disabled={!bookable || loading || !!error}
            onPress={() => (onBookSlot ? onBookSlot(facility) : setBooking(true))}
          >
            {bookable ? "Book a slot →" : "No online slots"}
          </Button>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  gallery: {
    height: 210,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#DFEEE3",
    alignItems: "center",
    justifyContent: "center",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  photoArrow: {
    position: "absolute",
    width: 38,
    height: 38,
    borderRadius: 20,
    backgroundColor: "rgba(0,20,10,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  counter: {
    position: "absolute",
    bottom: 12,
    right: 12,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(0,20,10,0.6)",
  },
  venueTitle: {
    color: "#193B2A",
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 24,
  },
  metrics: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#E2ECE5",
    marginTop: 14,
    paddingVertical: 14,
    gap: 10,
  },
  metric: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  metricValue: {
    color: "#224A33",
    fontSize: 12.5,
    fontWeight: "700",
  },
  fciCard: {
    backgroundColor: "#E8F6ED",
    borderRadius: 19,
    padding: 18,
    borderWidth: 1,
    borderColor: "#B7E1C7",
    gap: 12,
  },
  fciHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  fciEyebrow: {
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.7,
    color: "#065F46",
  },
  fciTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#113A26",
    lineHeight: 22,
  },
  scorePill: {
    flexDirection: "row",
    alignItems: "baseline",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#A7DFBE",
    flexShrink: 0,
  },
  scoreNum: {
    fontSize: 24,
    lineHeight: 29,
    fontWeight: "800",
    color: "#047857",
  },
  scoreOutOf: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    color: "#4B6356",
  },
  track: {
    height: 10,
    backgroundColor: "#CBE7D5",
    borderRadius: 8,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: GREEN,
    borderRadius: 8,
  },
  fciNotes: {
    fontSize: 12,
    lineHeight: 18,
    color: "#254B34",
  },
  fciDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  fciDateText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#065F46",
  },
  amenities: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  amenity: {
    width: "30%",
    flexGrow: 1,
    backgroundColor: "#F3F8F5",
    borderRadius: 13,
    padding: 12,
    alignItems: "center",
    gap: 7,
  },
  amenityLabel: {
    color: "#476250",
    fontSize: 10.5,
    textAlign: "center",
    fontWeight: "600",
  },
  sport: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingTop: 14,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E7EFEA",
  },
  sportName: {
    color: "#193B2A",
    fontSize: 14,
    fontWeight: "800",
  },
  plansWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 5,
  },
  planChip: {
    backgroundColor: "#E8F5EE",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  planChipText: {
    color: GREEN,
    fontSize: 10.5,
    fontWeight: "700",
  },
  rateBadge: {
    backgroundColor: "#ECFDF5",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    flexShrink: 0,
  },
  rate: {
    fontSize: 12,
    color: GREEN,
    fontWeight: "800",
  },
  bottom: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#DFE9E2",
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  price: {
    fontSize: 21,
    fontWeight: "800",
    color: "#173C28",
  },
  ratingAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FCD34D",
    backgroundColor: "#FFFBEB",
  },
  ratingTitle: {
    color: "#78350F",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 3,
  },
});
