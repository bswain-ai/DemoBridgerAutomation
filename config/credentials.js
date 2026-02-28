export const credentials = {
  baseUrl: process.env.URL,

  agent: {
    username: process.env.AGENT_EMAIL,
    password: process.env.PASSWORD
  },

  underwriter: {
    username: process.env.UW_EMAIL,
    password: process.env.PASSWORD
  },

  username: process.env.AGENT_EMAIL,
  password: process.env.PASSWORD,

  dataFile: process.env.DATA_FILE,
  resultFile: process.env.DATA_RESULT,
  raterFile: process.env.RATER_SHEET
};
