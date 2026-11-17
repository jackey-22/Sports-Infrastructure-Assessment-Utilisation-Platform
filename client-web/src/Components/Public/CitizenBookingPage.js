import React, { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getPublicFacilities } from "../../services/public/publicFacilityService";
import CitizenBookingModal from "./CitizenBookingModal";
import PublicNavbar from "./PublicNavbar";

export default function CitizenBookingPage() {
  const { facilityId } = useParams();
  const navigate = useNavigate();
  const [facility, setFacility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  return <div className="min-h-screen bg-slate-50">
    <PublicNavbar />
    <main className="mx-auto max-w-[1480px] px-4 py-6 sm:px-6">
      <Link to="/explore" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-700"><ArrowLeft className="h-4 w-4" />Back to facilities</Link>
      {loading ? <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div> : null}
      {error ? <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 font-semibold text-red-700">{error}</div> : null}
      {facility ? <CitizenBookingModal facility={facility} standalone onClose={() => navigate("/explore")} /> : null}
    </main>
  </div>;
}
