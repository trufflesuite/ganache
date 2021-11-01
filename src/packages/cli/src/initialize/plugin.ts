import { LoggingInformation } from "../types";

export default function (loggingInformation: LoggingInformation) {
  loggingInformation.data.forEach(loggingSection => {
    // print header section
    if (loggingSection.header) {
      console.log("");
      console.log(loggingSection.header);
      console.log("==================");
    }
    // print body section
    if (loggingSection.data && loggingSection.data.length > 0) {
      console.log("");
      loggingSection.data.forEach(entry => {
        console.log(entry);
      });
      console.log("==================");
    }
    // print footer section
    if (loggingSection.footer) {
      console.log("");
      console.log(loggingSection.footer);
      console.log("==================");
    }
  });
}
