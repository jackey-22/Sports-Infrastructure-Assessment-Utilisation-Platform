import { DEMO_MANAGERS, withOffline } from "../../../data/offlineLists";

export const ManagerService = {
  getData(id) {
    return withOffline(
      fetch(
        `http://localhost:9999/getuserwithsportscomplex?Role=3&&createdBy=${id}`
      )
        .then((res) => res.json())
        .then((res) => res.data),
      DEMO_MANAGERS
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

  //   getCustomers(params,id) {
  //     const queryParams = params
  //       ? Object.keys(params)
  //           .map(
  //             (k) => encodeURIComponent(k) + "=" + encodeURIComponent(params[k])
  //           )
  //           .join("&")
  //       : "";

  //     return fetch("http://localhost:9999/getuser?Role=3" + queryParams).then(
  //       (res) => res.json()
  //     );
  //   },
};
