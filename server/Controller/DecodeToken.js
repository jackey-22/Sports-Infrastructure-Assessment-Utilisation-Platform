const UserModel = require("../Model/UsersModel");
const { verifyAccessToken } = require("../Utils/tokens");

// Public session-restoration endpoint: the token is supplied in the body.
module.exports.decodedToken = async function (req, res) {
  try {
    const { token } = req.body || {};
    if (typeof token !== "string" || token.length === 0) {
      return res
        .status(401)
        .json({ data: "", msg: "Authentication required", rcode: -9 });
    }

    const decoded = verifyAccessToken(token);
    const user = await UserModel.findById(decoded.sub);
    if (!user || user.IsActive === 0) {
      return res
        .status(401)
        .json({ data: "", msg: "Account is inactive or no longer exists", rcode: -9 });
    }

    return res.json({ data: user, msg: "Verified", rcode: 200 });
  } catch (error) {
    return res
      .status(401)
      .json({ data: "", msg: "Invalid or expired token", rcode: -9 });
  }
};
