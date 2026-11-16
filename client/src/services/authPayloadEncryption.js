import api from "./api";

const encodeBase64 = (bytes) => {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const pemToBytes = (pem) => {
  const encoded = pem
    .replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s/g, "");
  const binary = atob(encoded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

export async function encryptAuthPayload(payload) {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Secure browser encryption is not available");
  }

  const { data } = await api.get("/auth/encryption-key");
  const publicKey = await globalThis.crypto.subtle.importKey(
    "spki",
    pemToBytes(data.publicKey),
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"]
  );
  const aesKey = globalThis.crypto.getRandomValues(new Uint8Array(32));
  const importedAesKey = await globalThis.crypto.subtle.importKey(
    "raw",
    aesKey,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await globalThis.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    importedAesKey,
    new TextEncoder().encode(JSON.stringify(payload))
  );
  const encryptedKey = await globalThis.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    aesKey
  );

  return {
    encryptedKey: encodeBase64(new Uint8Array(encryptedKey)),
    iv: encodeBase64(iv),
    ciphertext: encodeBase64(new Uint8Array(ciphertext)),
  };
}
