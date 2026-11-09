import { DEMO_FACILITY_SPORTS, withOffline } from "../../../data/offlineLists";

export const FacilityService = {
  getData(id) {
    return withOffline(
      fetch(`http://localhost:9999/getSportsComplexwithsport?manager=${id}`)
        .then((res) => res.json())
        .then((res) => res.data[0].sports),
      DEMO_FACILITY_SPORTS
    );
  },

  getCustomersSmall(id) {
    return Promise.resolve(this.getData(id).slice(0, 10));
  },

  getCustomersMedium(id) {
    return Promise.resolve(this.getData(id).slice(0, 50));
  },

  getCustomersLarge(id) {
    return Promise.resolve(this.getData(id).slice(0, 200));
  },

  getCustomersXLarge(id) {
    return Promise.resolve(this.getData(id));
  },

  //   getCustomers(params) {
  //     const queryParams = params
  //       ? Object.keys(params)
  //           .map(
  //             (k) => encodeURIComponent(k) + "=" + encodeURIComponent(params[k])
  //           )
  //           .join("&")
  //       : "";

  //     return fetch("http://localhost:9999/getSports" + queryParams).then((res) =>
  //       res.json()
  //     );
  //   },
};

