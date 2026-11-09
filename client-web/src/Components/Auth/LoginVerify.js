import { redirect } from "react-router-dom";
import { readDemoToken, homeForRole } from "./demoAuth";

const LoginVerify = async () => {
  const token = localStorage.getItem("token");
  if (!token) {
    return null;
  }

  // Offline demo session: skip the backend and go straight to the role home.
  const demoUser = readDemoToken(token);
  if (demoUser) {
    return redirect(homeForRole(demoUser.Role));
  }

  try {
    const response = await fetch("http://localhost:9999/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const result = await response.json();
    if (response.ok && result && result.rcode === 200) {
      if (result.data.Role === 5) {
        return redirect("/admin");
      } else if (result.data.Role === 4) {
        return redirect("/authority");
      } else if (result.data.Role === 3) {
        return redirect("/manager/overview");
      } else if (result.data.Role === 2) {
        return redirect("/coach/dashboard");
      } else if (result.data.Role === 0) {
        return redirect("/citizen/dashboard");
      }
    } else {
      localStorage.removeItem("token");
    }
  } catch (err) {
    console.log("LoginVerify connection error:", err);
  }

  return null;
};

export default LoginVerify;
