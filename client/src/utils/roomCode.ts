const ROOM_CODE_ALPHABET = '234679ACDEFGHJKMNPQRTUVWXYZ';
const ROOM_CODE_RAW_LENGTH = 8;
const ROOM_CODE_GROUP_SIZE = 4;

function randomFromAlphabet(length: number) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length]).join('');
}

export function generateRoomCode() {
  const raw = randomFromAlphabet(ROOM_CODE_RAW_LENGTH);
  return formatRoomCode(raw);
}

export function normalizeRoomCode(input: string) {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function formatRoomCode(input: string) {
  const normalized = normalizeRoomCode(input).slice(0, ROOM_CODE_RAW_LENGTH);
  if (!normalized) return '';
  const groups: string[] = [];
  for (let i = 0; i < normalized.length; i += ROOM_CODE_GROUP_SIZE) {
    groups.push(normalized.slice(i, i + ROOM_CODE_GROUP_SIZE));
  }
  return groups.join('-');
}

export function isValidRoomCode(input: string) {
  const normalized = normalizeRoomCode(input);
  if (normalized.length !== ROOM_CODE_RAW_LENGTH) return false;
  return [...normalized].every((char) => ROOM_CODE_ALPHABET.includes(char));
}

export function toSpokenRoomCode(input: string) {
  const formatted = formatRoomCode(input);
  if (!formatted) return '';
  return formatted
    .split('')
    .map((char) => (char === '-' ? 'dash' : char))
    .join(' ');
}
