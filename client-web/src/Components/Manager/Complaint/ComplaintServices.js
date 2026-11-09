import { managerComplaintRows, withOffline } from "../../../data/offlineLists";

export const ComplaintService = {
  getData(id, scope = "incoming", userId) {
    // "Incoming" is every open complaint raised for this facility, whatever
    // its level: a citizen/athlete complaint starts at level 0 and must reach
    // the facility inbox, not only the level-1 items already forwarded.
    const query =
      scope === "mine"
        ? `sportsComplex=${id}&userId=${userId}`
        : `sportsComplex=${id}&status=0`;

    return withOffline(
      fetch(`http://localhost:9999/getAllComplaints?${query}`)
        .then((res) => {
          if (!res.ok) throw new Error(`Request failed with ${res.status}`);
          return res.json();
        })
        .then((res) => res.data),
      managerComplaintRows(scope)
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

  getCustomersXLarge(id, scope, userId) {
    return Promise.resolve(this.getData(id, scope, userId));
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

