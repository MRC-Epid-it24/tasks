export default function genPassword(len) {
  const charSet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!#$%&*<>?@~';
  let password = '';
  for (let i = 0; i < len; i += 1) {
    password += charSet.charAt(Math.floor(Math.random() * charSet.length));
  }
  return password;
}
