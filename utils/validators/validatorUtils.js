/**
 * Dynamically formats validation messages with path replacement
 * @param {string} message - The message template (use $path for field name)
 * @returns {FieldMessageFactory} A validator message formatter
 */
const dynamicMsg =
  (message) =>
  (v, { path }) => {
    message = String(message).replaceAll("$path", path);
    return message[0].toUpperCase() + message.slice(1);
  };

module.exports = { dynamicMsg };
