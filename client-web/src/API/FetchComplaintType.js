import { useEffect } from "react";
import { ComplaintTypeActions } from "../store/ComplaintType";
import { useDispatch } from "react-redux";

function FetchComplaintType() {
  const dispatch = useDispatch();
  useEffect(() => {
    fetch("http://localhost:9999/getComplaintType")
      .then((response) => response.json())
      .then((result) => {
        if (result && Array.isArray(result.data)) {
          result.data.forEach((item) =>
            dispatch(ComplaintTypeActions.getcomplaintType(item))
          );
        }
      })
      .catch((error) => console.log("error fetching complaint types", error));
  }, [dispatch]);
}
export { FetchComplaintType };
