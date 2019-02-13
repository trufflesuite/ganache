/**
 * Sleep for a period of time in milliseconds
 * @param {number} milliseconds Number of milliseconds to wait
 * @returns {Promise} Asynchronous timeout for a period specified in millieseconds
 */
const sleep = async(milliseconds) => {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
};

module.exports = sleep;
