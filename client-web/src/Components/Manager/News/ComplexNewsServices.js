import { DEMO_COMPLEX_NEWS, withOffline } from "../../../data/offlineLists";

export const ComplexNewsServices = {
  getData(id) {
    return withOffline(
      fetch(`http://localhost:9999/getUpdates?level=2&sportComplexId=${id}`)
        .then((res) => res.json())
        .then((res) => res.data),
      DEMO_COMPLEX_NEWS
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

