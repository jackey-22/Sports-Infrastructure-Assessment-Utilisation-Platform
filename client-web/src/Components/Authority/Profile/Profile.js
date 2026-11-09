import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

const Profile = () => {
  const AuthorityData = useSelector((state) => state.user.user);
  const [lodaer, setloader] = useState(false);
  const [Profile, setProfile] = useState([{}]);
  console.log(AuthorityData);
  useEffect(() => {
    var requestOptions = {
      method: "GET",
      redirect: "follow",
    };

    fetch(
      `http://localhost:9999/getuserwithdistrict?_id=${AuthorityData._id}`,
      requestOptions
    )
      .then((response) => response.json())
      .then((result) => {
        console.log(result);
        setloader(true);
        setProfile(result.data[0]);
      })
      .catch((error) => console.log("error", error));
  }, []);

  const rows = [
    ["District", lodaer ? Profile.DistrictId?.District : ""],
    ["Email", AuthorityData.Email],
    ["Contact number", AuthorityData.ContactNum],
    ["Date of birth", AuthorityData.DOB],
  ];

  return (
    <div className="px-4 py-6 sm:px-6">
      <p className="text-xs font-bold uppercase tracking-wider text-brand-primary">
        District Authority
      </p>
      <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-brand-dark">
        {lodaer && Profile.Name ? Profile.Name : "Profile"}
      </h1>
      <p className="mt-1 text-sm text-slate-600">
        Your account and the district assigned to you.
      </p>

      <div className="mt-5 max-w-3xl rounded-2xl border border-slate-200 bg-white">
        <dl className="divide-y divide-slate-100">
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="grid gap-1 px-5 py-3 sm:grid-cols-3 sm:gap-3"
            >
              <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                {label}
              </dt>
              <dd className="text-sm font-semibold text-slate-800 sm:col-span-2">
                {value || "—"}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
};

export default Profile;
