import { randomInt } from 'node:crypto';

const NUMERIC = '123456789';
const ALPHANUMERIC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function makeid(length, chars = ALPHANUMERIC) {
  return Array.from({ length }, () => chars[randomInt(chars.length)]).join('');
}

export function makeOtp(length = 6) {
  return makeid(length, NUMERIC);
}
