import { randomInt } from "node:crypto";

export function generatePassword(length = 20): string {
  if (!Number.isInteger(length) || length < 3) {
    throw new RangeError("Password length must be an integer of at least 3");
  }

  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowercase = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const alphabet = `${uppercase}${lowercase}${digits}`;
  const password = [
    uppercase[randomInt(uppercase.length)],
    lowercase[randomInt(lowercase.length)],
    digits[randomInt(digits.length)],
  ];

  while (password.length < length) {
    password.push(alphabet[randomInt(alphabet.length)]);
  }

  for (let index = password.length - 1; index > 0; index--) {
    const swapIndex = randomInt(index + 1);
    [password[index], password[swapIndex]] = [
      password[swapIndex],
      password[index],
    ];
  }

  return password.join("");
}
