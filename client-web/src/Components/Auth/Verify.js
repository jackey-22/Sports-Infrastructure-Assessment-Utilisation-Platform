import { redirect } from "react-router-dom";
import store from "../../store";
import { UserActions } from "../../store/UserData";
import { readDemoToken } from "./demoAuth";

const Verify = async (role) => {
  const token = localStorage.getItem("token");
  if (!token) {
    return redirect("/login");
  }

  // Offline demo session: restore the demo user without calling the backend.
  const demoUser = readDemoToken(token);
  if (demoUser) {
    if (demoUser.Role === role) {
      store.dispatch(UserActions.getuserdata(demoUser));
      return demoUser;
    }
    localStorage.removeItem("token");
    return redirect("/login");
  }

  try {
    const response = await fetch("http://localhost:9999/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const result = await response.json();
    if (response.ok && result && result.rcode === 200) {
      if (result.data.Role === role) {
        // Restore the authenticated user into Redux after a page refresh.
        store.dispatch(UserActions.getuserdata(result.data));
        return result.data;
      }
    }
  } catch (error) {
    console.log("Auth verification connection error:", error);
  }

  localStorage.removeItem("token");
  return redirect("/login");
};

export default Verify;
