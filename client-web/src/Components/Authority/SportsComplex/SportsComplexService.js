import { DEMO_COMPLEX_ROWS, withOffline } from "../../../data/offlineLists";

export const SportComplexService = {
  getData(id) {
    return withOffline(
      fetch(
        `http://localhost:9999/getSportsComplexwithmanagerwithdistrict?district=${id}`
      )
        .then((res) => res.json())
        .then((res) => res.data),
      DEMO_COMPLEX_ROWS
    );
  },

  getCustomersSmall() {
    return Promise.resolve(this.getData().slice(0, 10));
  },

  getCustomersMedium() {
    return Promise.resolve(this.getData().slice(0, 50));
  },

  getCustomersLarge() {
    return Promise.resolve(this.getData().slice(0, 200));
  },

  getCustomersXLarge(id) {
    return Promise.resolve(this.getData(id));
  },

  // getCustomers(params) {
  //   const queryParams = params
  //     ? Object.keys(params)
  //         .map(
  //           (k) => encodeURIComponent(k) + "=" + encodeURIComponent(params[k])
  //         )
  //         .join("&")
  //     : "";

  //   return fetch("http://localhost:9999/getSportsComplex" + queryParams).then(
  //     (res) => res.json()
  //   );
  // },
};
