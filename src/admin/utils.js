export function generateRandomHash() {
  let hash = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < 4; i++) {
    hash += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return hash;
}
