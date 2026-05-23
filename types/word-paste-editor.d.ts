declare module 'word-paste-editor/cleaner' {
  const WordCleaner: {
    clean: (html: string) => string;
    isWordHTML: (html: string) => boolean;
  };

  export default WordCleaner;
}
