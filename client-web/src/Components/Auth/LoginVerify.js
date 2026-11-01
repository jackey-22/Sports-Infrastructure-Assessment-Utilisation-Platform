import { redirect } from "react-router-dom";

const LoginVerify = async () => {
  const token = localStorage.getItem("token");
  if (!token) {
    return null;
  }

  // Handle mock/demo token
  if (token.startsWith("mock_jwt_token_role_")) {
    const roleId = parseInt(token.replace("mock_jwt_token_role_", ""), 10);
    if (roleId === 5) return redirect("/admin");
    if (roleId === 4) return redirect("/authority");
    if (roleId === 3) return redirect("/manager");
    return null;
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
      if (result.data.Role === 5) {
        return redirect("/admin");
      } else if (result.data.Role === 4) {
        return redirect("/authority");
      } else if (result.data.Role === 3) {
        return redirect("/manager");
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
