import { useEffect } from "react";
import { ComplaintTypeActions } from "../store/ComplaintType";
import { useDispatch } from "react-redux";
import { DEMO_COMPLAINT_TYPES, withOffline } from "../data/offlineLists";

function FetchComplaintType() {
  const dispatch = useDispatch();
  useEffect(() => {
    withOffline(
      fetch("http://localhost:9999/getComplaintType")
        .then((response) => {
          if (!response.ok) throw new Error("offline");
          return response.json();
        }),
      { data: DEMO_COMPLAINT_TYPES }
    ).then((result) => {
      const rows = result && Array.isArray(result.data) && result.data.length
        ? result.data
        : DEMO_COMPLAINT_TYPES;
      rows.forEach((item) => dispatch(ComplaintTypeActions.getcomplaintType(item)));
    });
  }, [dispatch]);
}
export { FetchComplaintType };
