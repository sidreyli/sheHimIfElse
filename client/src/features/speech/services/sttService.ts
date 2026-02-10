type ResultHandler = (event: SpeechRecognitionEvent) => void;
type ErrorHandler = (event: SpeechRecognitionErrorEvent | Error) => void;

const resultHandlers = new Set<ResultHandler>();
const errorHandlers = new Set<ErrorHandler>();

let recognition: SpeechRecognition | null = null;
/** Whether the user has actively requested listening — used to auto-restart. */
let shouldBeListening = false;

function getSpeechRecognitionCtor():
  | (new () => SpeechRecognition)
  | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const ctor =
    window.SpeechRecognition ||
    (window as typeof window & { webkitSpeechRecognition?: new () => SpeechRecognition })
      .webkitSpeechRecognition;

  return ctor ?? null;
}

function getRecognition(): SpeechRecognition | null {
  if (recognition) {
    return recognition;
  }

  const SpeechRecognitionCtor = getSpeechRecognitionCtor();
  if (!SpeechRecognitionCtor) {
    return null;
  }

  recognition = new SpeechRecognitionCtor();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onresult = (event) => {
    resultHandlers.forEach((handler) => handler(event));
  };

  recognition.onerror = (event) => {
    errorHandlers.forEach((handler) => handler(event));
  };

  // Chrome/Edge periodically stop continuous recognition (server timeouts,
  // silence, network blips). Auto-restart when the user still wants to listen.
  recognition.onend = () => {
    if (shouldBeListening && recognition) {
      try {
        recognition.start();
      } catch {
        // If restart fails, emit error and give up
        shouldBeListening = false;
        errorHandlers.forEach((handler) =>
          handler(new Error('Speech recognition stopped unexpectedly.'))
        );
      }
    }
  };

  return recognition;
}

export function startListening() {
  const instance = getRecognition();
  if (!instance) {
    errorHandlers.forEach((handler) =>
      handler(new Error('Speech recognition requires Chrome or Edge.'))
    );
    return false;
  }

  try {
    shouldBeListening = true;
    instance.start();
    return true;
  } catch (error) {
    shouldBeListening = false;
    errorHandlers.forEach((handler) =>
      handler(error instanceof Error ? error : new Error('Speech recognition error'))
    );
    return false;
  }
}

export function stopListening() {
  shouldBeListening = false;
  const instance = getRecognition();
  if (!instance) {
    return;
  }

  try {
    instance.stop();
  } catch {
    // Ignore stop errors (e.g., already stopped).
  }
}

export function onResult(callback: ResultHandler) {
  resultHandlers.add(callback);
  return () => resultHandlers.delete(callback);
}

export function onError(callback: ErrorHandler) {
  errorHandlers.add(callback);
  return () => errorHandlers.delete(callback);
}
