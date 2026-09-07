import crypto from "crypto";

// 6-digit numeric code (always zero-padded to 6 digits, e.g. "004821").
const generateOtp = () => crypto.randomInt(0, 1000000).toString().padStart(6, "0");

export default generateOtp;
