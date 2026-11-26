import React, { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getPublicFacilities } from "../../services/public/publicFacilityService";
import CitizenBookingModal from "./CitizenBookingModal";
import PublicNavbar from "./PublicNavbar";
import { useSelector } from "react-redux";

export default function CitizenBookingPage({ embedded = false }) {
  const { facilityId } = useParams();
  const navigate = useNavigate();
  const user = useSelector((state) => state.user?.user);
  const [facility, setFacility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const backTarget = user?.Role === 0 ? "/citizen/explore" : "/explore";

  useEffect(() => {
    const controller = new AbortController();
    getPublicFacilities({ signal: controller.signal, bookableOnly: true })
      .then((rows) => {
        const selected = rows.find((row) => row.id === facilityId);
        if (!selected) throw new Error("Facility not found.");
        setFacility(selected);
      })
      .catch((loadError) => {
        if (loadError.name !== "AbortError") setError(loadError.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [facilityId]);

  return (
    <div className={embedded ? "w-full font-sans text-slate-800" : "min-h-screen bg-slate-50"}>
      {!embedded && <PublicNavbar />}
      <main className={embedded ? "mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8" : "mx-auto max-w-[1480px] px-4 py-6 sm:px-6"}>
        <Link
          to={backTarget}
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-emerald-700 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to facilities
        </Link>
        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : null}
        {error ? (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 font-semibold text-red-700">
            {error}
          </div>
        ) : null}
        {facility && user?.Role === 7 ? (
          <div className="mt-8 rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-extrabold text-slate-900">
              Use institution event booking
            </h1>
            <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
              Institution accounts cannot create individual citizen bookings. Build a multi-sport, multi-day event request for this facility instead.
            </p>
            <Link
              to={`/institute/new?facilityId=${facility.id}`}
              className="mt-5 inline-flex rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 transition"
            >
              Plan an institution event
            </Link>
          </div>
        ) : null}
        {facility && user?.Role !== 7 ? (
          <div className="mt-4">
            <CitizenBookingModal
              facility={facility}
              standalone
              onClose={() => navigate(backTarget)}
            />
          </div>
        ) : null}
      </main>
    </div>
  );
}
