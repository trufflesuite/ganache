export const sayPlease = () => {
  const pleaseArray = [
    "Didn't your mom teach you to say please?",
    "You'll have to ask nicely to get me to do anything for you.",
    "Don't you take that tone with me.",
    "Let's try that again using our manners this time."
  ];

  const randomEnough = Math.floor(Math.random() * pleaseArray.length);
  return pleaseArray[randomEnough];
};
