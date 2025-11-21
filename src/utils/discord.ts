const genPayload = (title: string, messages: string[], color: number) => {
  return {
    content: null,
    embeds: [
      {
        title,
        description: messages.join("\n"),
        color
      }
    ]
  };
};

export { genPayload };
