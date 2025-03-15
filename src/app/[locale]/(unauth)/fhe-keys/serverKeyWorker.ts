import { Buffer } from 'buffer';
import fhe, { TfheClientKey, TfheCompressedServerKey, TfheServerKey } from 'tfhe';

globalThis.onmessage = async (e) => {
  const { serializedClientKey } = e.data;

  try {
    // Initialize TFHE first
    await fhe();

    // Now we can use TFHE functions
    const clientKey = TfheClientKey.deserialize(serializedClientKey);
    const serverKey = TfheServerKey.new(clientKey);
    const compressedServerKey = TfheCompressedServerKey.new(clientKey);
    const serializedKey = compressedServerKey.serialize();

    // Convert to base64 using Buffer
    const base64Key = Buffer.from(serializedKey).toString('base64');

    // Clean up
    serverKey.free();
    compressedServerKey.free();
    clientKey.free();

    globalThis.postMessage({ base64Key });
  } catch (error: any) {
    globalThis.postMessage({ error: error.message });
  }
};
