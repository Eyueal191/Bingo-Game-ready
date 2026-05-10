const buildInlineKeyboard = (buttonRows) =>{
  return {
    inline_keyboard: buttonRows.map(row =>
      row.map(btn => {
        // If web_app exists, use it
        if (btn.web_app) {
          return {
            text: btn.text,
            web_app: btn.web_app,
          };
        }
        // Otherwise fallback to callback_data
        return {
          text: btn.text,
          callback_data: btn.callback_data,
        };
      })
    ),
  };
  
}
module.exports = { buildInlineKeyboard };