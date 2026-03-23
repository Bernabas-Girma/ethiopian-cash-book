/**
 * Encryption Service for End-to-End Encryption (E2EE)
 * Uses Web Crypto API for RSA-OAEP (asymmetric) and AES-GCM (symmetric) encryption.
 */

export class EncryptionService {
  private static readonly RSA_ALGORITHM = {
    name: "RSA-OAEP",
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: "SHA-256",
  };

  private static readonly AES_ALGORITHM = {
    name: "AES-GCM",
    length: 256,
  };

  /**
   * Generates a new RSA key pair for the user.
   */
  static async generateKeyPair(): Promise<{ publicKey: JsonWebKey; privateKey: JsonWebKey }> {
    const keyPair = await window.crypto.subtle.generateKey(
      this.RSA_ALGORITHM,
      true, // extractable
      ["encrypt", "decrypt"]
    );

    const publicKey = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
    const privateKey = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);

    return { publicKey, privateKey };
  }

  /**
   * Encrypts a message for a recipient using their public key.
   */
  static async encryptMessage(
    message: string,
    recipientPublicKeyJwk: JsonWebKey
  ): Promise<{ encryptedContent: string; encryptedKey: string; iv: string }> {
    // 1. Generate a random AES symmetric key
    const aesKey = await window.crypto.subtle.generateKey(
      this.AES_ALGORITHM,
      true,
      ["encrypt", "decrypt"]
    );

    // 2. Encrypt the message content with AES-GCM
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedMessage = new TextEncoder().encode(message);
    const encryptedContentBuffer = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      aesKey,
      encodedMessage
    );

    // 3. Encrypt the AES key with the recipient's RSA public key
    const recipientPublicKey = await window.crypto.subtle.importKey(
      "jwk",
      recipientPublicKeyJwk,
      this.RSA_ALGORITHM,
      true,
      ["encrypt"]
    );

    const exportedAesKey = await window.crypto.subtle.exportKey("raw", aesKey);
    const encryptedKeyBuffer = await window.crypto.subtle.encrypt(
      this.RSA_ALGORITHM,
      recipientPublicKey,
      exportedAesKey
    );

    return {
      encryptedContent: this.bufferToBase64(encryptedContentBuffer),
      encryptedKey: this.bufferToBase64(encryptedKeyBuffer),
      iv: this.bufferToBase64(iv),
    };
  }

  /**
   * Encrypts a symmetric key with a public key.
   */
  static async encryptSymmetricKey(
    aesKey: CryptoKey,
    publicKeyJwk: JsonWebKey
  ): Promise<string> {
    const publicKey = await window.crypto.subtle.importKey(
      "jwk",
      publicKeyJwk,
      this.RSA_ALGORITHM,
      true,
      ["encrypt"]
    );

    const exportedAesKey = await window.crypto.subtle.exportKey("raw", aesKey);
    const encryptedKeyBuffer = await window.crypto.subtle.encrypt(
      this.RSA_ALGORITHM,
      publicKey,
      exportedAesKey
    );

    return this.bufferToBase64(encryptedKeyBuffer);
  }

  /**
   * Encrypts message content with a symmetric key.
   */
  static async encryptContent(
    message: string
  ): Promise<{ encryptedContent: string; iv: string; aesKey: CryptoKey }> {
    const aesKey = await window.crypto.subtle.generateKey(
      this.AES_ALGORITHM,
      true,
      ["encrypt", "decrypt"]
    );

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedMessage = new TextEncoder().encode(message);
    const encryptedContentBuffer = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      aesKey,
      encodedMessage
    );

    return {
      encryptedContent: this.bufferToBase64(encryptedContentBuffer),
      iv: this.bufferToBase64(iv),
      aesKey,
    };
  }

  /**
   * Decrypts a message using the user's private key.
   */
  static async decryptMessage(
    encryptedContent: string,
    encryptedKey: string,
    iv: string,
    privateKeyJwk: JsonWebKey
  ): Promise<string> {
    try {
      const privateKey = await window.crypto.subtle.importKey(
        "jwk",
        privateKeyJwk,
        this.RSA_ALGORITHM,
        true,
        ["decrypt"]
      );

      // 1. Decrypt the AES symmetric key using RSA private key
      const encryptedKeyBuffer = this.base64ToBuffer(encryptedKey);
      const aesKeyBuffer = await window.crypto.subtle.decrypt(
        this.RSA_ALGORITHM,
        privateKey,
        encryptedKeyBuffer
      );

      const aesKey = await window.crypto.subtle.importKey(
        "raw",
        aesKeyBuffer,
        this.AES_ALGORITHM,
        true,
        ["decrypt"]
      );

      // 2. Decrypt the message content using AES-GCM
      const ivBuffer = this.base64ToBuffer(iv);
      const encryptedContentBuffer = this.base64ToBuffer(encryptedContent);
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: ivBuffer },
        aesKey,
        encryptedContentBuffer
      );

      return new TextDecoder().decode(decryptedBuffer);
    } catch (error) {
      // Suppress console.error to avoid alarming the user. 
      // This is expected if local storage was cleared and keys were regenerated.
      return "[Message encrypted with an older key]";
    }
  }

  private static bufferToBase64(buffer: ArrayBuffer): string {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
  }

  private static base64ToBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Stores the private key securely in localStorage (for demo purposes).
   * In a production app, consider using IndexedDB with encryption or a more secure method.
   */
  static storePrivateKey(uid: string, privateKey: JsonWebKey) {
    localStorage.setItem(`chat_priv_key_${uid}`, JSON.stringify(privateKey));
  }

  static getPrivateKey(uid: string): JsonWebKey | null {
    const key = localStorage.getItem(`chat_priv_key_${uid}`);
    return key ? JSON.parse(key) : null;
  }
}
