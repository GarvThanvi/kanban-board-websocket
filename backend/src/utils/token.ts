import crypto from "crypto";

export const generateShareToken : () => string = () => {
  return crypto.randomBytes(16).toString("hex");
};
