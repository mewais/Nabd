/** Ask the user for a JSON file and hand its text to `onText`. */
export function pickJsonFile(onText: (text: string) => void): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,application/json";
  input.onchange = () => {
    void input.files?.[0]?.text().then(onText);
  };
  input.click();
}
