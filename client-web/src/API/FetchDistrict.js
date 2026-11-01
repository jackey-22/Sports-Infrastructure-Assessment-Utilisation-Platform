import { useEffect } from "react";
import { DistrictActions } from "../store/District";
import { useDispatch } from "react-redux";

function FetchDistrict() {
  const dispatch = useDispatch();
  useEffect(() => {
    fetch("http://localhost:9999/getDistrict")
      .then((response) => response.json())
      .then((result) => {
        if (result && Array.isArray(result.data)) {
          result.data.forEach((item) =>
            dispatch(DistrictActions.getdistrict(item))
          );
        }
      })
      .catch((error) => console.log("error fetching districts", error));
  }, [dispatch]);
}
export { FetchDistrict };
