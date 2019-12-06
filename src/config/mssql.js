export default {
  requestTimeout: parseInt(process.env.MSSQL_REQUEST_TIMEOUT || 60 * 1000, 10),
  options: {
    cancelTimeout: parseInt(process.env.MSSQL_CANCEL_TIMEOUT || 60 * 1000, 10)
  }
};
