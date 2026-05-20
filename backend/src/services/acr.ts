import crypto from 'crypto';
import axios from 'axios';

const HOST = process.env.ACRCLOUD_HOST!;
const ACCESS_KEY = process.env.ACRCLOUD_ACCESS_KEY!;
const ACCESS_SECRET = process.env.ACRCLOUD_ACCESS_SECRET!;

export interface AcrResult {
  title: string;
  artist: string;
  confidence: number;
}

export async function identifyAudio(audioBuffer: Buffer): Promise<AcrResult | null> {
  const timestamp = Math.floor(Date.now() / 1000);
  const stringToSign = `POST\n/v1/identify\n${ACCESS_KEY}\naudio\n1\n${timestamp}`;
  const signature = crypto
    .createHmac('sha1', ACCESS_SECRET)
    .update(stringToSign)
    .digest('base64');

  const form = new FormData();
  form.append('sample', new Blob([audioBuffer], { type: 'audio/webm' }), 'sample.webm');
  form.append('access_key', ACCESS_KEY);
  form.append('data_type', 'audio');
  form.append('signature_version', '1');
  form.append('signature', signature);
  form.append('sample_bytes', audioBuffer.length.toString());
  form.append('timestamp', timestamp.toString());

  const response = await axios.post(`https://${HOST}/v1/identify`, form);

  const status = response.data?.status?.code;
  if (status !== 0) return null;

  const track = response.data.metadata.music[0];
  return {
    title: track.title,
    artist: track.artists[0].name,
    confidence: track.score,
  };
}
