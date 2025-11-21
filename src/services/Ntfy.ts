const sendNotification = async (title: string, message: string, env: Env, firstTry = true) => {
  try {
    const response = await fetch(env.NTFY_URL, {
      method: "POST",
      headers: {
        Title: title
      },
      body: message.replace(/\*\*/g, "")
    });
    if (!response.ok) {
      throw new Error(`Error enviando notificación a ntfy: ${response.status} ${await response.text()}`);
    }
  } catch (error) {
    if (firstTry) {
      return sendNotification(title, message, env, false);
    }
    console.error("Error enviando notificación a ntfy:", (error as Error).message);
  }
};

export { sendNotification };
