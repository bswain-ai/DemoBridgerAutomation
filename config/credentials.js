export const credentials = {
  username: process.env.AGENT_EMAIL ?? '',
  password: process.env.AGENT_PASSWORD ?? '',
  baseUrl: process.env.URL ?? '',
  dataFile: process.env.DATA_FILE,
  resultFile: process.env.DATA_RESULT
};
