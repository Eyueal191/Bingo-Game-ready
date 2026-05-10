// utils/audioUtils.js

export const playAudio = async (
  speakNumber,
  voiceOption,
  setPrefixedNumber
) => {
  let prefix = "";
  if (speakNumber >= 1 && speakNumber <= 15) {
    prefix = "b";
  } else if (speakNumber >= 16 && speakNumber <= 30) {
    prefix = "i";
  } else if (speakNumber >= 31 && speakNumber <= 45) {
    prefix = "n";
  } else if (speakNumber >= 46 && speakNumber <= 60) {
    prefix = "g";
  } else if (speakNumber >= 61 && speakNumber <= 75) {
    prefix = "o";
  }

  const prefixedNumber = prefix + speakNumber;
  setPrefixedNumber(prefixedNumber);
  // Constructing the audio element
  const audioModule = await import(
    `../assets/${voiceOption}${prefixedNumber}.mp3`
  );
  const audio = new Audio(audioModule.default);
  audio.play();
};
