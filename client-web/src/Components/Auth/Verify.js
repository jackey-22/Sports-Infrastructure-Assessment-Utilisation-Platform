import { redirect } from "react-router-dom";

const Verify = async (role) => {
  const token = localStorage.getItem("token");
  if (!token) {
    return redirect("/login");
  }

  // Seamless support for mock/demo role preview
  if (token.startsWith("mock_jwt_token_role_")) {
    const roleId = parseInt(token.replace("mock_jwt_token_role_", ""), 10);
    if (roleId === role) {
      return { Role: roleId, Email: "demo@sag.gujarat.gov.in" };
    } else {
      return redirect("/login");
    }
  }

  try {
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    const raw = JSON.stringify({ token: token });
    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: raw,
    };
    const response = await fetch(
      "http://localhost:9999/verify",
      requestOptions
    );
    const result = await response.json();
    if (result && result.rcode === 200) {
      if (result.data.Role === role) {
        return result.data;
      } else {
        return redirect("/login");
      }
    }
  } catch (error) {
    console.log("Auth verification connection error:", error);
  }

  return redirect("/login");
};

export default Verify;
