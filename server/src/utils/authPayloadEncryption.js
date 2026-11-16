import {
  constants,
  createDecipheriv,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  privateDecrypt,
} from "node:crypto";

const configuredPrivateKey = process.env.AUTH_PAYLOAD_PRIVATE_KEY_BASE64;
const privateKey = configuredPrivateKey
  ? loadConfiguredPrivateKey(configuredPrivateKey)
  : generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicExponent: 0x10001,
    }).privateKey;

function loadConfiguredPrivateKey(value) {
  try {
    const pem = Buffer.from(value.trim().replace(/\s/g, ""), "base64").toString("utf8");
    const key = createPrivateKey(pem);

    if (
      key.asymmetricKeyType !== "rsa" ||
      (key.asymmetricKeyDetails?.modulusLength ?? 0) < 2048
    ) {
      throw new Error("The key must be RSA with at least 2048 bits");
    }

    return key;
  } catch (error) {
    throw new Error(
      "AUTH_PAYLOAD_PRIVATE_KEY_BASE64 must contain a base64-encoded PKCS#8 RSA private key (2048 bits or larger). Generate a new value using the README command.",
      { cause: error }
    );
  }
}

export const authPayloadPublicKey = createPublicKey(privateKey).export({
  type: "spki",
  format: "pem",
});

export const decryptAuthPayload = (req, res, next) => {
  const { encryptedKey, iv, ciphertext } = req.body ?? {};

  if (
    typeof encryptedKey !== "string" ||
    typeof iv !== "string" ||
    typeof ciphertext !== "string"
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid or unreadable encrypted authentication payload",
    });
  }

  let payload;
  try {
    const rawKey = privateDecrypt(
      {
        key: privateKey,
        padding: constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      Buffer.from(encryptedKey, "base64")
    );
    const initializationVector = Buffer.from(iv, "base64");
    const encryptedData = Buffer.from(ciphertext, "base64");

    if (initializationVector.length !== 12 || encryptedData.length <= 16) {
      throw new Error("Invalid encrypted authentication payload");
    }

    const decipher = createDecipheriv("aes-256-gcm", rawKey, initializationVector);
    decipher.setAuthTag(encryptedData.subarray(-16));
    const plaintext = Buffer.concat([
      decipher.update(encryptedData.subarray(0, -16)),
      decipher.final(),
    ]).toString("utf8");
    payload = JSON.parse(plaintext);

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Invalid authentication payload");
    }
  } catch {
    return res.status(400).json({
      success: false,
      message: "Invalid or unreadable encrypted authentication payload",
    });
  }

  req.body = payload;
  return next();
};
