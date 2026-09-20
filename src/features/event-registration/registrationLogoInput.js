export const REGISTRATION_LOGO_LIMIT = 2 * 1024 * 1024

// File.type can be empty or inaccurate for files downloaded from chat apps.
// The server still decodes the complete image before accepting it.
export function detectRegistrationLogoType(bytes) {
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) return 'image/png'
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg'
  if (String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'image/webp'
  return null
}
