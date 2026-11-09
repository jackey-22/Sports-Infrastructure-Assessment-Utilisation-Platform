import { DEMO_GUEST_SLOTS, withOffline } from "../../data/offlineLists";

export const SlotServices = {
  getData(id) {
    return withOffline(
      fetch(`http://localhost:9999/getGuest`).then((res) => {
        if (!res.ok) throw new Error(`Request failed with ${res.status}`);
        return res.json();
      }).then((res) => (Array.isArray(res) ? res : res.data)),
      DEMO_GUEST_SLOTS
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

