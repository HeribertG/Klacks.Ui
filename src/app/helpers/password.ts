export function generatePassword(length: number = 8): string {
  if (length < 8) {
    length = 8;
  }

  const charsetLower = 'abcdefghijklmnopqrstuvwxyz';
  const charsetUpper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const specialChars = '@#?!';

  const randomLower = charsetLower.charAt(
    Math.floor(Math.random() * charsetLower.length)
  );
  const randomUpper = charsetUpper.charAt(
    Math.floor(Math.random() * charsetUpper.length)
  );
  const randomDigit = digits.charAt(Math.floor(Math.random() * digits.length));
  const randomSpecial = specialChars.charAt(
    Math.floor(Math.random() * specialChars.length)
  );

  let password = randomLower + randomUpper + randomDigit + randomSpecial;

  const allChars = charsetLower + charsetUpper + digits + specialChars;
  while (password.length < length) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }

  password = password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');

  return password;
}

export const enum PasswordCheckStrength {
  Short,
  Common,
  Weak,
  Ok,
  Strong,
}

export function checkPasswordStrength(password: string): PasswordCheckStrength {
  function isPasswordCommon(pwd: string): boolean {
    const commonPasswordPatterns =
      /passw.*|12345.*|09876.*|qwert.*|asdfg.*|zxcvb.*|footb.*|baseb.*|drago.*/;
    return commonPasswordPatterns.test(pwd);
  }

  const minimumLength = 8;

  if (password === null || password.length < minimumLength) {
    return PasswordCheckStrength.Short;
  }

  if (isPasswordCommon(password)) {
    return PasswordCheckStrength.Common;
  }

  let numberOfElements = 0;
  numberOfElements += /[a-z]/.test(password) ? 1 : 0; // Lowercase letters
  numberOfElements += /[A-Z]/.test(password) ? 1 : 0; // Uppercase letters
  numberOfElements += /[0-9]/.test(password) ? 1 : 0; // Numbers
  numberOfElements += /[^a-zA-Z0-9]/.test(password) ? 1 : 0; // Special characters (inc. space)

  if (numberOfElements === 0 || numberOfElements === 1) {
    return PasswordCheckStrength.Weak;
  } else if (numberOfElements === 2) {
    return PasswordCheckStrength.Ok;
  } else {
    return PasswordCheckStrength.Strong;
  }
}
