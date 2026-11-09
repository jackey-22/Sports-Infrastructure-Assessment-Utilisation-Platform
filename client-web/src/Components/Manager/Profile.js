import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useSelector } from "react-redux";
import { MANAGER_FACILITY } from "../../data/manager/managerDemoData";
import { withOffline } from "../../data/offlineLists";
const Profile = () => {
  const AuthorityData = useSelector((state) => state.user.user);
  const [lodaer, setloader] = useState(false);
  const [Profile, setProfile] = useState([{}]);

  const [url, setUrl] = useState("");
  const [qr, setQr] = useState("");

  const GenerateQRCode = () => {
    QRCode.toDataURL(
      url,
      {
        width: 600,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#EEEEEEFF",
        },
      },
      (err, qrCodeDataUrl) => {
        if (err) {
          console.error(err);
          return;
        }

        // Convert the data URL to a Blob
        fetch(qrCodeDataUrl)
          .then((response) => response.blob())
          .then((blob) => {
            const formData = new FormData();
            formData.append("qrcode", blob, "qrcode.png");

            // Now you can use the formData for your desired operation
          })
          .catch((error) => {
            console.error("Error converting QR code data URL to Blob:", error);
          });

        setQr(qrCodeDataUrl);
      }
    );
  };

  useEffect(() => {
    var requestOptions = {
      method: "GET",
      redirect: "follow",
    };

    const demoProfile = {
      Name: AuthorityData.Name,
      SportComplexId: {
        name: MANAGER_FACILITY.name,
        area: "14.5 acres",
        taluka: MANAGER_FACILITY.taluka,
        operationalSince: "2016",
      },
    };
    withOffline(
      fetch(
        `http://localhost:9999/getuserwithsportscomplex?_id=${AuthorityData._id}`,
        requestOptions
      )
        .then((response) => {
          if (!response.ok) throw new Error("offline");
          return response.json();
        })
        .then((result) => result.data[0]),
      demoProfile
    ).then((profile) => {
      setloader(true);
      setProfile(profile || demoProfile);
    });
    setUrl(`${MANAGER_FACILITY.name} · ${AuthorityData.SportComplexId || "khokhra"}`);
  }, []);

  const complex = lodaer && Profile && Profile.SportComplexId ? Profile.SportComplexId : {};
  const rows = [
    ["Name", lodaer ? Profile.Name : ""],
    ["Sports complex", complex.name || ""],
    ["Email", AuthorityData.Email || ""],
    ["Contact", AuthorityData.ContactNum || ""],
    ["Date of birth", AuthorityData.DOB || ""],
    ["Area", complex.area || ""],
    ["Taluka", complex.taluka || ""],
    ["Operational since", complex.operationalSince || ""],
  ];

  return (
    <div className="px-4 py-6 sm:px-6">
      <p className="text-xs font-bold uppercase tracking-wider text-brand-primary">
        Facility Manager
      </p>
      <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-brand-dark">
        Profile
      </h1>
      <p className="mt-1 text-sm text-slate-600">
        Your account and the complex assigned to you.
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="rounded-2xl border border-slate-200 bg-white">
          <dl className="divide-y divide-slate-100">
            {rows.map(([label, value]) => (
              <div key={label} className="grid gap-1 px-5 py-3 sm:grid-cols-3 sm:gap-3">
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt>
                <dd className="text-sm font-semibold text-slate-800 sm:col-span-2">{value || "—"}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-extrabold text-brand-dark">Complex QR</h2>
          <p className="mt-1 text-xs text-slate-500">
            Athletes can scan this code for the complex.
          </p>
          <button
            type="button"
            onClick={GenerateQRCode}
            className="mt-4 min-h-11 w-full rounded-lg bg-brand-primary px-4 text-sm font-bold text-white hover:bg-brand-dark"
          >
            Generate QR code
          </button>
          {qr ? (
            <div className="mt-4">
              <img className="mx-auto w-44 rounded-lg border border-slate-200" src={qr} alt="Complex QR code" />
              <a
                href={qr}
                download="qrcode.png"
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-200 text-sm font-bold text-brand-dark"
              >
                Download
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default Profile;

