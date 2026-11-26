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
  canRate = false
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
    loadFacilities({
      id: selected.id
    }).then(result => {
      if (alive) {
        if (!result.data?.length) throw new Error("This facility is no longer available.");
        setFacility(result.data[0]);
        setPhoto(0);
      }
    }).catch(err => {
      if (alive) setError(err.message);
    }).finally(() => {
      if (alive) setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [selected?.id, revision]);
  if (booking) return <BookingCheckoutScreen facility={facility} onBack={() => setBooking(false)} onDone={() => setBooking(false)} />;
  if (!facility) return <View style={ui.safe}><View style={ui.screen}><AppScreenScroll contentContainerStyle={ui.content} header={<AppHeader title="Facility details" onBack={back} />}><StateMessage title="No facility selected" message="Choose a facility from Explore." action={back ? "Go back" : undefined} onAction={back} /></AppScreenScroll></View></View>;
  const photos = [...new Set([
    facility.picture,
    ...(facility.gallery || []),
    ...(facility.sports || []).flatMap(sp => sp.images || (sp.image ? [sp.image] : [])),
    ...(facility.conditionPhotos || []).map(cp => cp.url),
  ].map(imageUrl).filter(Boolean))];
  const score = facility.condition?.score;
  const price = startingPrice(facility);
  const amenities = AMENITIES.filter(a => facility.amenities?.[a.key]);
  const bookable = facility.status === "Active" && facility.sports?.some(s => s.bookable);
  const contact = (value, type) => value && value !== "Not specified" ? <TouchableOpacity accessibilityRole="link" onPress={() => Linking.openURL(type === "tel" ? `tel:${value.replace(/[^+0-9]/g, "")}` : `mailto:${value}`)} style={[ui.row, {
    paddingVertical: 8
  }]}><Ionicons name={type === "tel" ? "call-outline" : "mail-outline"} size={18} color={GREEN} /><Text style={[ui.muted, {
      flex: 1,
      color: GREEN
    }]}>{value}</Text></TouchableOpacity> : null;
  return <View style={ui.safe}><View style={ui.screen}>
    <AppScreenScroll showsVerticalScrollIndicator={false} contentContainerStyle={{
        paddingBottom: 20
      }} header={<AppHeader title={facility.name} subtitle={`${facility.district} | ${facility.category || "Sports complex"}`} onBack={back} actions={[{
        label: "Share facility",
        icon: "share-social-outline",
        onPress: () => Share.share({
          message: `${facility.name}\n${facility.location || facility.district}\n${timingLabel(facility)}`
        })
      }]} />}>

      <View style={ui.content}>
        {loading && <ActivityIndicator color={GREEN} />}
        {!!error && <View style={ui.card}><Text style={ui.error}>{error}</Text><Button secondary onPress={() => setRevision(v => v + 1)}>Retry live details</Button></View>}
        <View style={s.gallery}>{photos.length ? <Image source={{
              uri: photos[photo]
            }} style={s.heroImage} /> : <Ionicons name="business-outline" size={50} color="#8CB49A" />}{photos.length > 1 && <><TouchableOpacity accessibilityLabel="Previous photo" style={[s.photoArrow, {
                left: 10
              }]} onPress={() => setPhoto(v => (v + photos.length - 1) % photos.length)}><Ionicons name="chevron-back" size={22} color="white" /></TouchableOpacity><TouchableOpacity accessibilityLabel="Next photo" style={[s.photoArrow, {
                right: 10
              }]} onPress={() => setPhoto(v => (v + 1) % photos.length)}><Ionicons name="chevron-forward" size={22} color="white" /></TouchableOpacity></>}{photos.length > 0 && <View style={s.counter}><Text style={{
                color: "white",
                fontSize: 11
              }}>{photo + 1} / {photos.length}</Text></View>}</View>
        <View style={ui.card}><Text style={ui.sectionTitle}>{facility.name}</Text><Text style={[ui.muted, {
              marginVertical: 8
            }]}>{facility.location || "Address not provided"}</Text><View style={ui.badge}><Text style={ui.badgeText}>{facility.condition?.grade || "Condition not assessed"}</Text></View><View style={s.metrics}>{[[facility.details?.area ? `${facility.details.area} acres` : "Not provided", "Total area"], [facility.operationalSince || "Not provided", "Operational since"], [facility.status || "Not provided", "Facility status"]].map(([value, label]) => <View key={label} style={s.metric}><Text style={s.metricValue}>{value}</Text><Text style={ui.muted}>{label}</Text></View>)}</View><Text style={ui.muted}>{facility.ownership || "Authority not provided"}</Text></View>
        <View style={[ui.card, {
            backgroundColor: "#E8F6ED"
          }]}><View style={[ui.row, {
              justifyContent: "space-between"
            }]}><Text style={[ui.sectionTitle, {
                flex: 1
              }]}>Facility Condition Index</Text><Text style={s.score}>{score ?? "-"}<Text style={ui.muted}> /100</Text></Text></View><Text style={ui.muted}>Infrastructure health assessment</Text>{typeof score === "number" && <View style={s.track}><View style={[s.fill, {
                width: `${Math.max(0, Math.min(100, score))}%`
              }]} /></View>}<Text style={ui.muted}>{facility.condition?.notes || "Assessment notes not provided"}</Text>{!!facility.condition?.lastInspectionDate && <Text style={[ui.muted, {
              marginTop: 8
            }]}>Last inspection: {facility.condition.lastInspectionDate}</Text>}</View>
        <View style={ui.card}><Text style={ui.sectionTitle}>Infrastructure amenities</Text><View style={s.amenities}>{amenities.map(a => <View style={s.amenity} key={a.key}><Ionicons name={a.icon} size={27} color={GREEN} /><Text style={s.amenityLabel}>{a.label}</Text></View>)}</View>{!amenities.length && <Text style={ui.muted}>No amenities recorded.</Text>}</View>
        <View style={ui.card}><Text style={ui.sectionTitle}>Sports, rates &amp; plans</Text>{facility.sports?.map((sport, index) => <View style={s.sport} key={`${sport.id}-${index}`}><View style={{
                flex: 1
              }}><Text style={s.metricValue}>{sport.name}</Text><Text style={ui.muted}>{sport.bookable ? "Online slots available" : "Contact facility for availability"}</Text><Text style={[ui.muted, { color: sport.condition ? GREEN : colors.slate[400], marginTop: 3 }]}>{sport.condition ? `${sport.condition.grade} · ${sport.condition.score}/100 condition` : "Condition not assessed"}</Text>{!!sport.subscriptionPlans?.length && <Text style={[ui.muted, { color: GREEN, fontWeight: "700", marginTop: 3 }]}>Plans: {sport.subscriptionPlans.map(p => `${p.name} (₹${p.price}/${p.durationType === "yearly" ? "yr" : "mo"})`).join(" · ")}</Text>}</View><Text style={s.rate}>{sport.price ? `₹${sport.price.amount}/${sport.price.unit || "slot"}` : "Contact facility"}</Text></View>)}{!facility.sports?.length && <Text style={ui.muted}>No sports configured.</Text>}</View>
        {canRate ? <TouchableOpacity accessibilityRole="button" onPress={() => setRatingOpen(true)} style={s.ratingAction}><Ionicons name="star" size={22} color="#F59E0B" /><View style={{ flex: 1 }}><Text style={s.ratingTitle}>Rate facility, sport or coach</Text><Text style={ui.muted}>Share a star rating or update your previous review.</Text></View><Ionicons name="chevron-forward" size={20} color={GREEN} /></TouchableOpacity> : null}
        <View style={ui.card}><Text style={ui.sectionTitle}>Administration & contact</Text><View style={[ui.row, {
              marginTop: 14
            }]}><Ionicons name="person-circle-outline" size={36} color={GREEN} /><View style={{
                flex: 1
              }}><Text style={s.metricValue}>{facility.contactPerson || "Facility administration"}</Text><Text style={ui.muted}>{timingLabel(facility)}</Text></View></View>{contact(facility.contactPhone, "tel")}{contact(facility.contactEmail, "email")}{Number.isFinite(facility.latitude) && Number.isFinite(facility.longitude) && <Button secondary onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${facility.latitude},${facility.longitude}`)}>Get directions ↗</Button>}</View>
      </View>
    </AppScreenScroll>
    <CitizenRatingModal visible={ratingOpen} facility={facility} onClose={() => setRatingOpen(false)} />
    <View style={s.bottom}><View style={{
          flex: 1
        }}><Text style={ui.muted}>Pay & play - from</Text><Text style={s.price}>{price != null ? `₹${price}` : "Contact facility"}</Text></View><Button disabled={!bookable || loading || !!error} onPress={() => onBookSlot ? onBookSlot(facility) : setBooking(true)}>{bookable ? "Book a slot →" : "No online slots"}</Button></View>
  </View></View>;
}
const s = StyleSheet.create({
  gallery: {
    height: 205,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#DFEEE3",
    alignItems: "center",
    justifyContent: "center"
  },
  heroImage: {
    width: "100%",
    height: "100%"
  },
  photoArrow: {
    position: "absolute",
    width: 38,
    height: 38,
    borderRadius: 20,
    backgroundColor: "rgba(0,20,10,0.5)",
    alignItems: "center",
    justifyContent: "center"
  },
  counter: {
    position: "absolute",
    bottom: 12,
    right: 12,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(0,20,10,0.6)"
  },
  metrics: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#E2ECE5",
    marginTop: 15,
    paddingVertical: 15,
    gap: 12
  },
  metric: {
    flex: 1,
    gap: 4
  },
  metricValue: {
    color: "#224A33",
    fontSize: 12,
    fontWeight: "700"
  },
  score: {
    fontSize: 29,
    color: "#173C28",
    fontWeight: "800"
  },
  track: {
    height: 10,
    backgroundColor: "#D2E7DA",
    borderRadius: 8,
    marginVertical: 16,
    overflow: "hidden"
  },
  fill: {
    height: "100%",
    backgroundColor: GREEN,
    borderRadius: 8
  },
  amenities: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 15
  },
  amenity: {
    width: "30%",
    flexGrow: 1,
    backgroundColor: "#F3F8F5",
    borderRadius: 13,
    padding: 12,
    alignItems: "center",
    gap: 8
  },
  amenityLabel: {
    color: "#476250",
    fontSize: 10,
    textAlign: "center"
  },
  sport: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 15,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E7EFEA"
  },
  rate: {
    fontSize: 11,
    color: GREEN,
    fontWeight: "700"
  },
  bottom: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#DFE9E2",
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  price: {
    fontSize: 21,
    fontWeight: "800",
    color: "#173C28"
  },
  ratingAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FCD34D",
    backgroundColor: "#FFFBEB"
  },
  ratingTitle: {
    color: "#78350F",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 3
  }
});
