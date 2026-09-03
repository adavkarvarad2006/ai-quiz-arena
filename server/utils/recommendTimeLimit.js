export const recommendTimeLimit = (difficulty) => {
  switch (difficulty) {
    case "Easy":
      return 10;
    case "Hard":
      return 25;
    case "Medium":
    default:
      return 15;
  }
};